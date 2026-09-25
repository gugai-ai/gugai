export type IntentType =
  | "WORKFLOW"
  | "CAPABILITY"
  | "MULTI_CAPABILITY"
  | "UNKNOWN";

export type DetectedCapability = {
  slug: string;
  name: string;
};

export type DetectedWorkflow = {
  slug: string;
  name: string;
};

export type DetectedIntent = {
  type: IntentType;
  capabilities: DetectedCapability[];
  workflow: DetectedWorkflow | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

/**
 * Capability definitions.
 *
 * These are intent signals only.
 * The database remains the source of truth for
 * whether a capability actually exists and which
 * tools support it.
 */
const capabilityRules = [
  {
    slug: "background-removal",
    name: "Background Removal",
    keywords: [
      "remove background",
      "remove the background",
      "background removal",
      "background remover",
      "transparent background",
      "cut out background",
      "remove bg",
    ],
  },
  {
    slug: "image-editing",
    name: "Image Editing",
    keywords: [
  "edit image",
  "edit images",
  "image editing",
  "edit photo",
  "edit photos",
  "edit product image",
  "edit product images",
  "edit my product image",
  "edit my product images",
  "edit a product image",
  "edit product photos",
  "edit my product photos",
  "photo editing",
],
  },
  {
    slug: "image-generation",
    name: "Image Generation",
    keywords: [
      "generate image",
      "generate images",
      "create image",
      "create images",
      "ai image",
      "ai images",
      "image generation",
      "generate a picture",
      "create a picture",
    ],
  },
  {
    slug: "speech-to-text",
    name: "Speech to Text",
    keywords: [
  "speech to text",
  "speech-to-text",
  "transcribe",
  "transcription",
  "transcribe audio",
  "transcribe podcast",
  "transcribe my podcast",
  "audio to text",
  "convert audio to text",
  "convert my audio to text",
  "convert podcast audio to text",
  "convert my podcast audio to text",
  "turn audio into text",
  "turn my audio into text",
  "turn podcast into text",
  "turn my podcast into text",
  "convert my podcast audio into text",
  "convert podcast audio into text",
],
  },
  {
    slug: "text-to-speech",
    name: "Text to Speech",
    keywords: [
      "text to speech",
      "text-to-speech",
      "tts",
      "voiceover",
      "voice over",
      "convert text to voice",
      "read text aloud",
      "generate voice",
      "ai voice",
    ],
  },
  {
    slug: "video-generation",
    name: "Video Generation",
    keywords: [
      "video generation",
      "generate video",
      "generate videos",
      "create ai video",
      "create ai videos",
      "ai video",
      "ai videos",
      "text to video",
      "text-to-video",
      "image to video",
      "image-to-video",
    ],
  },
];

/**
 * Workflow definitions.
 *
 * Workflows have priority over individual capabilities.
 */
const workflowRules = [
  {
    slug: "podcast-to-video",
    name: "Podcast to Video",
    keywords: [
      "podcast to video",
      "podcast into a video",
      "podcast into video",
      "turn my podcast into a video",
      "turn podcast into a video",
      "convert podcast to video",
      "convert my podcast into a video",
    ],
  },
  {
    slug: "podcast-to-shorts",
    name: "Podcast to YouTube Shorts",
    keywords: [
      "podcast to shorts",
      "podcast into shorts",
      "podcast to youtube shorts",
      "podcast into youtube shorts",
      "turn podcast into shorts",
      "turn my podcast into shorts",
    ],
  },
];

/**
 * Normalize user input before matching.
 */
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Check whether a normalized query contains
 * any of the supplied keyword signals.
 */
function containsKeyword(
  query: string,
  keywords: string[]
): boolean {
  return keywords.some((keyword) => query.includes(keyword));
}

/**
 * Detect the user's intent.
 *
 * Priority:
 *
 * 1. Workflow
 * 2. Multiple capabilities
 * 3. Single capability
 * 4. Unknown
 */
export function detectIntent(query: string): DetectedIntent {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      type: "UNKNOWN",
      capabilities: [],
      workflow: null,
      confidence: "LOW",
    };
  }

  // --------------------------------------------------
  // 1. Workflow detection
  // --------------------------------------------------

  const matchedWorkflow = workflowRules.find((workflow) =>
    containsKeyword(normalizedQuery, workflow.keywords)
  );

  if (matchedWorkflow) {
    return {
      type: "WORKFLOW",
      capabilities: [],
      workflow: {
        slug: matchedWorkflow.slug,
        name: matchedWorkflow.name,
      },
      confidence: "HIGH",
    };
  }

  // --------------------------------------------------
  // 2. Capability detection
  // --------------------------------------------------

  const matchedCapabilities = capabilityRules
    .filter((capability) =>
      containsKeyword(normalizedQuery, capability.keywords)
    )
    .map((capability) => ({
      slug: capability.slug,
      name: capability.name,
    }));

  // --------------------------------------------------
  // 3. Multiple capabilities
  // --------------------------------------------------

  if (matchedCapabilities.length > 1) {
    return {
      type: "MULTI_CAPABILITY",
      capabilities: matchedCapabilities,
      workflow: null,
      confidence: "HIGH",
    };
  }

  // --------------------------------------------------
  // 4. Single capability
  // --------------------------------------------------

  if (matchedCapabilities.length === 1) {
    return {
      type: "CAPABILITY",
      capabilities: matchedCapabilities,
      workflow: null,
      confidence: "HIGH",
    };
  }

  // --------------------------------------------------
  // 5. Unknown
  // --------------------------------------------------

  return {
    type: "UNKNOWN",
    capabilities: [],
    workflow: null,
    confidence: "LOW",
  };
}