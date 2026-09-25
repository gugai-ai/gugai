import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

const WORKFLOW_INTENTS: WorkflowIntent[] = [
  {
    slug: "podcast-to-video",
    name: "Podcast to Video",
  },
];

function detectWorkflow(query: string): WorkflowIntent | null {
  const normalized = query.toLowerCase();

  const hasPodcast =
    normalized.includes("podcast");

  const hasVideo =
    normalized.includes("video") ||
    normalized.includes("youtube") ||
    normalized.includes("shorts");

  if (hasPodcast && hasVideo) {
    return WORKFLOW_INTENTS[0];
  }

  return null;
}

function detectCapability(query: string) {
  const normalized = query.toLowerCase();

  if (
    normalized.includes("background") &&
    (
      normalized.includes("remove") ||
      normalized.includes("removal")
    )
  ) {
    return {
      capabilitySlug: "background-removal",
      capabilityName: "Background Removal",
    };
  }

  if (
    normalized.includes("video") &&
    (
      normalized.includes("create") ||
      normalized.includes("generate") ||
      normalized.includes("make")
    )
  ) {
    return {
      capabilitySlug: "video-generation",
      capabilityName: "Video Generation",
    };
  }

  if (
    normalized.includes("podcast") &&
    (
      normalized.includes("text") ||
      normalized.includes("transcri")
    )
  ) {
    return {
      capabilitySlug: "speech-to-text",
      capabilityName: "Speech to Text",
    };
  }

  if (
    normalized.includes("voiceover") ||
    normalized.includes("voice over") ||
    normalized.includes("read aloud")
  ) {
    return {
      capabilitySlug: "text-to-speech",
      capabilityName: "Text to Speech",
    };
  }

  if (
    normalized.includes("image") &&
    (
      normalized.includes("generate") ||
      normalized.includes("create")
    )
  ) {
    return {
      capabilitySlug: "image-generation",
      capabilityName: "Image Generation",
    };
  }

  if (
    normalized.includes("image") &&
    (
      normalized.includes("edit") ||
      normalized.includes("editing")
    )
  ) {
    return {
      capabilitySlug: "image-editing",
      capabilityName: "Image Editing",
    };
  }

  return null;
}

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
  const uniqueTools = new Map<string, any>();

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

    /*
     * ---------------------------------------------------------
     * 1. WORKFLOW MATCHING
     * ---------------------------------------------------------
     *
     * Check workflows first because a workflow query can contain
     * capability keywords such as "video".
     *
     * Example:
     * "Turn my podcast into a video"
     *
     * should become:
     * Podcast to Video workflow
     *
     * rather than:
     * Video Generation only.
     */
    const workflowIntent = detectWorkflow(query);

    if (workflowIntent) {
      return NextResponse.json(
        await recommendWorkflow(
          supabase,
          workflowIntent,
          query
        )
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. SINGLE CAPABILITY MATCHING
     * ---------------------------------------------------------
     *
     * Preserve the existing deterministic recommendation path.
     */
    const intent = detectCapability(query);

    if (!intent) {
      return NextResponse.json({
        success: true,
        state: "INSUFFICIENT_DATA" as RecommendationState,
        query,
        intent: {
          capabilitySlug: null,
          capabilityName: null,
        },
        message:
          "I could not determine the required capability from this request.",
        tools: [],
      });
    }

    const { data: capability, error: capabilityError } =
      await supabase
        .from("capabilities")
        .select(`
          id,
          name,
          slug
        `)
        .eq("slug", intent.capabilitySlug)
        .maybeSingle();

    if (capabilityError) {
      console.error(
        "CAPABILITY LOOKUP ERROR:",
        capabilityError
      );

      return NextResponse.json(
        {
          success: false,
          error: capabilityError.message,
        },
        { status: 500 }
      );
    }

    if (!capability) {
      return NextResponse.json({
        success: true,
        state: "INSUFFICIENT_DATA" as RecommendationState,
        query,
        intent,
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
        intent,
        capability,
        count: 0,
        tools: [],
      });
    }

    return NextResponse.json({
      success: true,
      state: "EXACT_MATCH" as RecommendationState,
      query,
      intent,
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