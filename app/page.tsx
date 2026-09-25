"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";
import ToolCard from "@/components/ToolCard";

type Tool = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  website_url: string;
  logo_url: string | null;
  verification_status: string;
  matched_capability_verification_status?: string;
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
  };
};

type WorkflowStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  name: string;
  description?: string | null;
  required_capability_id?: string | null;
  input_artifact?: string | null;
  output_artifact?: string | null;
  constraints?: Record<string, unknown>;
  capability?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tools?: Tool[];
  state?: string;
};

type Workflow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_key?: string | null;
  status: string;
  follow_up_prompts?: unknown;
};

type DetectedCapability = {
  slug: string;
  name: string;
};

type CapabilityMatch = {
  capability: {
    id: string;
    name: string;
    slug: string;
  } | null;
  detected_capability?: DetectedCapability;
  state: string;
  tools: Tool[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: Tool[];
  workflow?: Workflow;
  steps?: WorkflowStep[];
  state?: string;
  intentType?: string;
  capabilities?: DetectedCapability[];
  capabilityMatches?: CapabilityMatch[];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(message: string) {
    const trimmed = message.trim();

    if (!trimmed || isLoadingTools) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((previous) => [...previous, userMessage]);
    setIsLoadingTools(true);
    setToolsError(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmed,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to get recommendations."
        );
      }

      let assistantContent = "";

      if (result.state === "WORKFLOW_MATCH") {
        const workflowName =
          result.workflow?.name || "workflow";

        const stepCount = result.steps?.length || 0;

        assistantContent =
          stepCount > 0
            ? `I found the ${workflowName} workflow with ${stepCount} step${
                stepCount === 1 ? "" : "s"
              }.`
            : `I found the ${workflowName} workflow.`;
      } else if (result.intent?.type === "MULTI_CAPABILITY") {
        const capabilityCount = result.capabilities?.length || 0;

        assistantContent =
          capabilityCount > 0
            ? `I found a solution covering ${capabilityCount} capabilities.`
            : "I found a solution covering multiple capabilities.";
      } else if (result.state === "EXACT_MATCH") {
        assistantContent =
          result.tools?.length > 0
            ? `I found ${result.tools.length} tool${
                result.tools.length === 1 ? "" : "s"
              } that match your request.`
            : "I found a matching capability, but no active tools are currently available.";
      } else if (result.state === "PARTIAL_MATCH") {
        assistantContent =
          "I found a partial match for your request.";
      } else if (result.state === "NO_MATCH") {
        assistantContent =
          "I understand what capability you need, but I don't currently have a matching tool in the Gugai catalog.";
      } else if (result.state === "INSUFFICIENT_DATA") {
        assistantContent =
          "I need a little more information to determine which AI capability you need.";
      } else {
        assistantContent =
          "I couldn't determine the best match for that request.";
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        tools: result.tools ?? [],
        workflow: result.workflow ?? undefined,
        steps: result.steps ?? [],
        state: result.state,
        intentType: result.intent?.type,
        capabilities: result.capabilities ?? [],
        capabilityMatches: result.capability_matches ?? [],
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } catch (error) {
      console.error("RECOMMENDATION ERROR:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      setToolsError(errorMessage);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I couldn't process that request right now. Please try again.",
      };

      setMessages((previous) => [...previous, assistantMessage]);
    } finally {
      setIsLoadingTools(false);
    }
  }

  function getToolForStep(
    step: WorkflowStep,
    tools: Tool[]
  ): Tool | undefined {
    // First preference:
    // If the API already returned tools inside the step, use them.
    if (step.tools && step.tools.length > 0) {
      return step.tools[0];
    }

    // Otherwise match the step capability against
    // the top-level recommendation tools.
    if (step.capability?.id) {
      const matchedTool = tools.find(
        (tool) =>
          tool.matched_capability_verification_status === "VERIFIED"
      );

      if (matchedTool) {
        return matchedTool;
      }
    }

    return undefined;
  }

  function renderWorkflow(
    workflow: Workflow,
    steps: WorkflowStep[],
    tools: Tool[]
  ) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        {/* Workflow header */}
        <div className="border-b border-zinc-800 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold">
              {workflow.icon_key === "video" ? "▶" : "W"}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-white">
                  {workflow.name}
                </h3>

                <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                  Workflow matched
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {workflow.description}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow steps */}
        <div className="divide-y divide-zinc-800">
          {steps.map((step, index) => {
            const tool = getToolForStep(step, tools);

            return (
              <div key={step.id} className="px-5 py-5">
                <div className="flex gap-4">
                  {/* Step number */}
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white">
                      {step.step_order || index + 1}
                    </div>

                    {index < steps.length - 1 && (
                      <div className="mt-2 h-full min-h-8 w-px bg-zinc-800" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-white">
                        {step.name}
                      </h4>

                      {step.capability?.name && (
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400">
                          {step.capability.name}
                        </span>
                      )}
                    </div>

                    {step.description && (
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {step.description}
                      </p>
                    )}

                    {/* Artifact flow */}
                    {(step.input_artifact ||
                      step.output_artifact) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        {step.input_artifact && (
                          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1">
                            Input: {step.input_artifact}
                          </span>
                        )}

                        <span className="text-zinc-700">→</span>

                        {step.output_artifact && (
                          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1">
                            Output: {step.output_artifact}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Matched tool */}
                    {tool && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm font-semibold text-zinc-400">
                            {tool.logo_url ? (
                              <img
                                src={tool.logo_url}
                                alt=""
                                className="h-7 w-7 rounded object-contain"
                              />
                            ) : (
                              tool.name.charAt(0)
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-white">
                                {tool.name}
                              </span>

                              {tool.matched_capability_verification_status ===
                                "VERIFIED" && (
                                <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                                  Capability verified
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-zinc-500">
                              {tool.companies?.name || tool.name}
                            </p>

                            <p className="mt-2 text-sm leading-5 text-zinc-400">
                              {tool.short_description}
                            </p>

                            <a
                              href={tool.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-white"
                            >
                              Visit website
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {!tool && (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
                        No verified tool is currently available for this
                        workflow step.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMultiCapabilityRecommendation(
    capabilityMatches: CapabilityMatch[],
    tools: Tool[]
  ) {
    const toolCapabilities = new Map<string, string[]>();

    for (const match of capabilityMatches) {
      const capabilityName =
        match.capability?.name ||
        match.detected_capability?.name;

      if (!capabilityName) {
        continue;
      }

      for (const tool of match.tools) {
        const names = toolCapabilities.get(tool.id) ?? [];

        if (!names.includes(capabilityName)) {
          names.push(capabilityName);
        }

        toolCapabilities.set(tool.id, names);
      }
    }

    return (
      <div className="grid gap-6">
        <div className="grid gap-3">
          {capabilityMatches.map((match) => {
            const capabilityName =
              match.capability?.name ||
              match.detected_capability?.name ||
              "Detected capability";

            return (
              <section
                key={
                  match.capability?.id ||
                  match.detected_capability?.slug ||
                  capabilityName
                }
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <h3 className="text-base font-semibold text-white">
                  {capabilityName}
                </h3>

                {match.tools.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {match.tools.map((tool) => (
                      <li
                        key={tool.id}
                        className="flex items-center gap-2 text-sm text-zinc-300"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {tool.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    No verified tool is currently available.
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {tools.length > 0 && (
          <section>
            <h3 className="mb-3 text-base font-semibold text-white">
              Recommended tools
            </h3>

            <div className="grid gap-3">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  name={tool.name}
                  description={tool.short_description}
                  websiteUrl={tool.website_url}
                  logoUrl={tool.logo_url}
                  companyName={tool.companies.name}
                  capabilityNames={toolCapabilities.get(tool.id)}
                  verificationStatus={
                    tool.matched_capability_verification_status ===
                    "VERIFIED"
                      ? "CAPABILITY VERIFIED"
                      : tool.verification_status
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const examplePrompts = [
    "Turn my podcast into YouTube Shorts",
    "Find the best AI tools for creating product videos",
    "Build an AI stack for my marketing workflow",
  ];

  return (
    <div className="flex h-dvh overflow-hidden bg-black text-white">
      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex min-h-16 items-center border-b border-zinc-800 px-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Gugai
            </p>

            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
              AI Stack Intelligence
            </h1>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          {/* Conversation */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
            {messages.length === 0 ? (
              <div className="flex min-h-full items-center justify-center">
                <div className="w-full max-w-3xl text-center">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-lg font-semibold shadow-xl shadow-black/20">
                    G
                  </div>

                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                    GUGAI
                  </p>

                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Tell us what you want to accomplish.
                  </h2>

                  <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
                    Gugai finds the right AI tools, compares them, and builds
                    the right stack for your workflow.
                  </p>

                  <div className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
                    {examplePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-5 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex flex-col gap-3"
                  >
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                    />

                    {/* Workflow recommendation */}
                    {message.role === "assistant" &&
                      message.state === "WORKFLOW_MATCH" &&
                      message.workflow &&
                      message.steps &&
                      message.steps.length > 0 && (
                        <div>
                          {renderWorkflow(
                            message.workflow,
                            message.steps,
                            message.tools ?? []
                          )}
                        </div>
                      )}

                    {/* Normal tool recommendation */}
                    {message.role === "assistant" &&
                      message.intentType === "MULTI_CAPABILITY" &&
                      message.capabilityMatches && (
                        <div>
                          {renderMultiCapabilityRecommendation(
                            message.capabilityMatches,
                            message.tools ?? []
                          )}
                        </div>
                      )}

                    {/* Normal tool recommendation */}
                    {message.role === "assistant" &&
                      message.intentType !== "MULTI_CAPABILITY" &&
                      message.state !== "WORKFLOW_MATCH" &&
                      message.tools &&
                      message.tools.length > 0 && (
                        <div className="grid gap-3">
                          {message.tools.map((tool) => (
                            <ToolCard
                              key={tool.id}
                              name={tool.name}
                              description={tool.short_description}
                              websiteUrl={tool.website_url}
                              logoUrl={tool.logo_url}
                              companyName={tool.companies.name}
                              verificationStatus={
                                tool.matched_capability_verification_status ===
                                "VERIFIED"
                                  ? "CAPABILITY VERIFIED"
                                  : tool.verification_status
                              }
                            />
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {isLoadingTools && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    Analyzing your request and building the recommendation...
                  </div>
                )}

                {toolsError && (
                  <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
                    {toolsError}
                  </div>
                )}

                <div ref={conversationEndRef} />
              </div>
            )}
          </div>

          {/* Chat input */}
          <div className="border-t border-zinc-900 px-4 py-3 sm:px-6 sm:py-4">
            <div className="mx-auto w-full max-w-4xl">
              <ChatInput onSend={handleSend} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}