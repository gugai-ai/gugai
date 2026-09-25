import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RecommendationState =
  | "EXACT_MATCH"
  | "PARTIAL_MATCH"
  | "NO_MATCH"
  | "INSUFFICIENT_DATA";

type Intent = {
  capabilitySlug: string | null;
  capabilityName: string | null;
};

const capabilityRules: {
  capabilitySlug: string;
  capabilityName: string;
  keywords: string[];
}[] = [
  {
    capabilitySlug: "background-removal",
    capabilityName: "Background Removal",
    keywords: [
      "remove background",
      "remove the background",
      "background removal",
      "background remover",
      "transparent background",
      "remove bg",
    ],
  },
  {
  capabilitySlug: "image-editing",
  capabilityName: "Image Editing",
  keywords: [
    "edit image",
    "edit images",
    "image editing",
    "edit photo",
    "edit photos",
    "edit my product images",
    "edit product images",
    "product image editing",
    "modify image",
    "modify images",
    "modify product images",
  ],
},
  {
    capabilitySlug: "image-generation",
    capabilityName: "Image Generation",
    keywords: [
      "generate image",
      "generate images",
      "create image",
      "create images",
      "ai image",
      "image generation",
      "generate a picture",
      "create a picture",
    ],
  },
  {
  capabilitySlug: "speech-to-text",
  capabilityName: "Speech to Text",
  keywords: [
    "speech to text",
    "speech-to-text",
    "transcribe",
    "transcription",
    "transcribe audio",
    "convert audio to text",
    "convert audio into text",
    "audio to text",
    "audio into text",
    "podcast to text",
    "podcast audio to text",
    "podcast audio into text",
  ],
},
  {
    capabilitySlug: "text-to-speech",
    capabilityName: "Text to Speech",
    keywords: [
      "text to speech",
      "text-to-speech",
      "voiceover",
      "voice over",
      "read aloud",
      "turn text into voice",
      "convert text to audio",
      "ai voice",
    ],
  },
  {
    capabilitySlug: "video-generation",
    capabilityName: "Video Generation",
    keywords: [
      "generate video",
      "generate videos",
      "create video",
      "create videos",
      "ai video",
      "video generation",
      "text to video",
      "image to video",
    ],
  },
];

function detectIntent(query: string): Intent {
  const normalizedQuery = query.toLowerCase().trim();

  for (const rule of capabilityRules) {
    const matched = rule.keywords.some((keyword) =>
      normalizedQuery.includes(keyword)
    );

    if (matched) {
      return {
        capabilitySlug: rule.capabilitySlug,
        capabilityName: rule.capabilityName,
      };
    }
  }

  return {
    capabilitySlug: null,
    capabilityName: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const query =
      typeof body.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query is required.",
        },
        { status: 400 }
      );
    }

    const intent = detectIntent(query);

    if (!intent.capabilitySlug) {
      return NextResponse.json({
        success: true,
        state: "INSUFFICIENT_DATA" as RecommendationState,
        query,
        intent,
        message:
          "I could not determine the required capability from this request.",
        tools: [],
      });
    }

    const supabase = await createClient();

    // Find the capability in the canonical catalog.
    const { data: capability, error: capabilityError } = await supabase
      .from("capabilities")
      .select("id, name, slug")
      .eq("slug", intent.capabilitySlug)
      .maybeSingle();

    if (capabilityError) {
      console.error("CAPABILITY LOOKUP ERROR:", capabilityError);

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
        message:
          "The detected capability is not available in the Gugai catalog yet.",
        tools: [],
      });
    }

    // Find tools connected to this capability.
    const { data: toolCapabilities, error: toolCapabilityError } =
      await supabase
        .from("tool_capabilities")
        .select(`
          tool_id,
          support_mode
        `)
        .eq("capability_id", capability.id)
        .eq("support_mode", "FULL");

    if (toolCapabilityError) {
      console.error(
        "TOOL CAPABILITY LOOKUP ERROR:",
        toolCapabilityError
      );

      return NextResponse.json(
        {
          success: false,
          error: toolCapabilityError.message,
        },
        { status: 500 }
      );
    }

    const toolIds = [
      ...new Set(
        (toolCapabilities ?? []).map((item) => item.tool_id)
      ),
    ];

    if (toolIds.length === 0) {
      return NextResponse.json({
        success: true,
        state: "NO_MATCH" as RecommendationState,
        query,
        intent,
        capability,
        tools: [],
        message:
          "No catalog tools currently match this capability.",
      });
    }

    // Fetch the canonical tool records.
    const { data: tools, error: toolsError } = await supabase
      .from("tools")
      .select(`
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
      `)
      .in("id", toolIds)
      .eq("status", "ACTIVE")
      .order("name");

    if (toolsError) {
      console.error("TOOLS LOOKUP ERROR:", toolsError);

      return NextResponse.json(
        {
          success: false,
          error: toolsError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      state: "EXACT_MATCH" as RecommendationState,
      query,
      intent,
      capability,
      count: tools?.length ?? 0,
      tools: tools ?? [],
    });
  } catch (error) {
    console.error("RECOMMEND API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process recommendation request.",
      },
      { status: 500 }
    );
  }
}