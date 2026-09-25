import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectIntent } from "@/lib/recommendation/intent";

type RecommendationState =
  | "EXACT_MATCH"
  | "PARTIAL_MATCH"
  | "NO_MATCH"
  | "INSUFFICIENT_DATA"
  | "WORKFLOW_MATCH";

type WorkflowIntent = {
  slug: string;
  name: string;
};

type VerifiedTool = Awaited<
  ReturnType<typeof getVerifiedToolsForCapability>
>[number];

async function getVerifiedToolsForCapability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  capabilityId: string
) {
  const { data: toolCapabilities, error: toolCapabilityError } =
    await supabase
      .from("tool_capabilities")
      .select(`
        tool_id,
        capability_id,
        support_mode,
        tools (
          id,
          name,
          slug,
          short_description,
          website_url,
          logo_url,
          verification_status,
          status,
          companies (
            id,
            name,
            logo_url
          )
        )
      `)
      .eq("capability_id", capabilityId)
      .eq("support_mode", "FULL");

  if (toolCapabilityError) {
    throw new Error(toolCapabilityError.message);
  }

  const verifiedTools = [];

  for (const relationship of toolCapabilities ?? []) {
    const tool = Array.isArray(relationship.tools)
      ? relationship.tools[0]
      : relationship.tools;

    if (!tool || tool.status !== "ACTIVE") {
      continue;
    }

    const { data: claims, error: claimError } = await supabase
      .from("claims")
      .select("id")
      .eq("tool_id", relationship.tool_id)
      .eq("capability_id", capabilityId)
      .eq("claim_type", "CAPABILITY_SUPPORT")
      .eq("status", "ACTIVE");

    if (claimError) {
      throw new Error(claimError.message);
    }

    let capabilityVerified = false;

    for (const claim of claims ?? []) {
      const { data: verification, error: verificationError } =
        await supabase
          .from("verifications")
          .select("status")
          .eq("claim_id", claim.id)
          .eq("status", "VERIFIED")
          .limit(1)
          .maybeSingle();

      if (verificationError) {
        throw new Error(verificationError.message);
      }

      if (verification) {
        capabilityVerified = true;
        break;
      }
    }

    if (!capabilityVerified) {
      continue;
    }

    verifiedTools.push({
      ...tool,
      matched_capability_verification_status: "VERIFIED",
    });
  }

  return verifiedTools;
}

async function recommendWorkflow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workflowIntent: WorkflowIntent,
  query: string
) {
  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select(`
      id,
      name,
      slug,
      description,
      icon_key,
      status,
      follow_up_prompts
    `)
    .eq("slug", workflowIntent.slug)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (workflowError) {
    throw new Error(workflowError.message);
  }

  if (!workflow) {
    return {
      success: true,
      state: "INSUFFICIENT_DATA" as RecommendationState,
      query,
      intent: {
        type: "WORKFLOW",
        workflowSlug: workflowIntent.slug,
      },
      message: "The requested workflow is not currently available.",
      workflow: null,
      steps: [],
      tools: [],
    };
  }

  const { data: steps, error: stepsError } = await supabase
    .from("workflow_steps")
    .select(`
      id,
      workflow_id,
      step_order,
      name,
      description,
      required_capability_id,
      input_artifact,
      output_artifact,
      constraints
    `)
    .eq("workflow_id", workflow.id)
    .order("step_order");

  if (stepsError) {
    throw new Error(stepsError.message);
  }

  if (!steps || steps.length === 0) {
    return {
      success: true,
      state: "INSUFFICIENT_DATA" as RecommendationState,
      query,
      intent: {
        type: "WORKFLOW",
        workflowSlug: workflow.slug,
        workflowName: workflow.name,
      },
      message: "This workflow does not have any configured steps yet.",
      workflow,
      steps: [],
      tools: [],
    };
  }

  const workflowSteps = [];

  for (const step of steps) {
    if (!step.required_capability_id) {
      workflowSteps.push({
        ...step,
        capability: null,
        tools: [],
        state: "INSUFFICIENT_DATA" as RecommendationState,
      });

      continue;
    }

    const { data: capability, error: capabilityError } =
      await supabase
        .from("capabilities")
        .select(`
          id,
          name,
          slug
        `)
        .eq("id", step.required_capability_id)
        .maybeSingle();

    if (capabilityError) {
      throw new Error(capabilityError.message);
    }

    const tools = await getVerifiedToolsForCapability(
      supabase,
      step.required_capability_id
    );

    workflowSteps.push({
      ...step,
      capability,
      tools,
      state:
        tools.length > 0
          ? ("EXACT_MATCH" as RecommendationState)
          : ("INSUFFICIENT_DATA" as RecommendationState),
    });
  }

  const allStepsHaveTools = workflowSteps.every(
    (step) => step.tools.length > 0
  );

  const anyStepHasTools = workflowSteps.some(
    (step) => step.tools.length > 0
  );

  let state: RecommendationState;

  if (allStepsHaveTools) {
    state = "WORKFLOW_MATCH";
  } else if (anyStepHasTools) {
    state = "PARTIAL_MATCH";
  } else {
    state = "INSUFFICIENT_DATA";
  }

  /*
   * Flatten tools for compatibility with the current page.tsx.
   * The structured workflow steps remain the canonical response.
   */
  const uniqueTools = new Map<string, VerifiedTool>();

  for (const step of workflowSteps) {
    for (const tool of step.tools) {
      uniqueTools.set(tool.id, tool);
    }
  }

  return {
    success: true,
    state,
    query,
    intent: {
      type: "WORKFLOW",
      workflowSlug: workflow.slug,
      workflowName: workflow.name,
    },
    workflow,
    steps: workflowSteps,
    count: uniqueTools.size,
    tools: Array.from(uniqueTools.values()),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const query =
      typeof body?.query === "string"
        ? body.query.trim()
        : "";

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query is required.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const detectedIntent = detectIntent(query);

    if (detectedIntent.type === "WORKFLOW" && detectedIntent.workflow) {
      return NextResponse.json(
        await recommendWorkflow(
          supabase,
          detectedIntent.workflow,
          query
        )
      );
    }

    if (detectedIntent.type === "UNKNOWN") {
      return NextResponse.json({
        success: true,
        state: "INSUFFICIENT_DATA" as RecommendationState,
        query,
        intent: {
          type: "UNKNOWN",
          capabilitySlug: null,
          capabilityName: null,
        },
        message:
          "I could not determine the required capability from this request.",
        tools: [],
      });
    }

    const { data: capabilities, error: capabilitiesError } =
      await supabase
        .from("capabilities")
        .select(`
          id,
          name,
          slug
        `)
        .in(
          "slug",
          detectedIntent.capabilities.map((capability) => capability.slug)
        );

    if (capabilitiesError) {
      console.error(
        "CAPABILITY LOOKUP ERROR:",
        capabilitiesError
      );

      return NextResponse.json(
        {
          success: false,
          error: capabilitiesError.message,
        },
        { status: 500 }
      );
    }

    const capabilityBySlug = new Map(
      (capabilities ?? []).map((capability) => [capability.slug, capability])
    );

    if (detectedIntent.type === "MULTI_CAPABILITY") {
      const capabilityMatches = [];
      const uniqueTools = new Map<string, VerifiedTool>();

      for (const detectedCapability of detectedIntent.capabilities) {
        const capability = capabilityBySlug.get(detectedCapability.slug);

        if (!capability) {
          capabilityMatches.push({
            capability: null,
            detected_capability: detectedCapability,
            state: "INSUFFICIENT_DATA" as RecommendationState,
            tools: [],
          });
          continue;
        }

        const tools = await getVerifiedToolsForCapability(
          supabase,
          capability.id
        );

        for (const tool of tools) {
          uniqueTools.set(tool.id, tool);
        }

        capabilityMatches.push({
          capability,
          state:
            tools.length > 0
              ? ("EXACT_MATCH" as RecommendationState)
              : ("NO_MATCH" as RecommendationState),
          tools,
        });
      }

      return NextResponse.json({
        success: true,
        state:
          capabilityMatches.every((match) => match.tools.length > 0)
            ? ("EXACT_MATCH" as RecommendationState)
            : capabilityMatches.some((match) => match.tools.length > 0)
              ? ("PARTIAL_MATCH" as RecommendationState)
              : ("NO_MATCH" as RecommendationState),
        query,
        intent: detectedIntent,
        capabilities: detectedIntent.capabilities,
        capability_matches: capabilityMatches,
        count: uniqueTools.size,
        tools: Array.from(uniqueTools.values()),
      });
    }

    const detectedCapability = detectedIntent.capabilities[0];
    const capability = detectedCapability
      ? capabilityBySlug.get(detectedCapability.slug)
      : null;

    if (!capability) {
      return NextResponse.json({
        success: true,
        state: "INSUFFICIENT_DATA" as RecommendationState,
        query,
        intent: {
          ...detectedIntent,
          capabilitySlug: detectedCapability?.slug ?? null,
          capabilityName: detectedCapability?.name ?? null,
        },
        capability: null,
        tools: [],
      });
    }

    const tools = await getVerifiedToolsForCapability(
      supabase,
      capability.id
    );

    if (tools.length === 0) {
      return NextResponse.json({
        success: true,
        state: "NO_MATCH" as RecommendationState,
        query,
        intent: {
          ...detectedIntent,
          capabilitySlug: detectedCapability.slug,
          capabilityName: detectedCapability.name,
        },
        capability,
        count: 0,
        tools: [],
      });
    }

    return NextResponse.json({
      success: true,
      state: "EXACT_MATCH" as RecommendationState,
      query,
      intent: {
        ...detectedIntent,
        capabilitySlug: detectedCapability.slug,
        capabilityName: detectedCapability.name,
      },
      capability,
      count: tools.length,
      tools,
    });
  } catch (error) {
    console.error("RECOMMENDATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process recommendation request.",
      },
      { status: 500 }
    );
  }
}