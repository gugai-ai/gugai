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

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools?: Tool[];
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

    // Add the user's message immediately.
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((previous) => [...previous, userMessage]);

    setIsLoadingTools(true);
    setToolsError(null);

    try {
      // Send the user's request to the deterministic recommendation engine.
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

      switch (result.state) {
        case "EXACT_MATCH":
          if (result.tools?.length > 0) {
            assistantContent =
              result.tools.length === 1
                ? "I found 1 tool that matches your request."
                : `I found ${result.tools.length} tools that match your request.`;
          } else {
            assistantContent =
              "I found a matching capability, but no active tools are currently available.";
          }
          break;

        case "PARTIAL_MATCH":
          assistantContent =
            "I found a partial match for your request.";
          break;

        case "NO_MATCH":
          assistantContent =
            "I understand what capability you need, but I don't currently have a matching tool in the Gugai catalog.";
          break;

        case "INSUFFICIENT_DATA":
          assistantContent =
            "I need a little more information to determine which AI capability you need.";
          break;

        default:
          assistantContent =
            "I processed your request, but couldn't determine a recommendation state.";
      }

      // Each assistant message gets its own tools.
      // This keeps previous recommendations visible in the conversation.
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        tools: result.tools ?? [],
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
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

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } finally {
      setIsLoadingTools(false);
    }
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

        {/* Main content */}
        <section className="flex min-h-0 flex-1 flex-col">
          {/* Conversation area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
            {messages.length === 0 ? (
              /* Empty state */
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
                    Gugai finds the right AI tools, compares them,
                    and builds the best stack for your workflow.
                  </p>

                  {/* Example prompts */}
                  <div className="mx-auto mt-8 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
                    {examplePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={isLoadingTools}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-5 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Conversation */
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="flex flex-col gap-3"
                  >
                    {/* User / assistant message */}
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                    />

                    {/* Tools belonging specifically to this message */}
                    {message.tools &&
                      message.tools.length > 0 && (
                        <div className="grid gap-3">
                          {message.tools.map((tool) => (
                            <ToolCard
                              key={tool.id}
                              name={tool.name}
                              description={
                                tool.short_description
                              }
                              websiteUrl={tool.website_url}
                              logoUrl={tool.logo_url}
                              companyName={
                                tool.companies.name
                              }
                              verificationStatus={
                                tool.matched_capability_verification_status
                              }
                            />
                          ))}
                        </div>
                      )}
                  </div>
                ))}

                {/* Loading state */}
                {isLoadingTools && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                    Searching the Gugai catalog...
                  </div>
                )}

                {/* Error state */}
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
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput onSend={handleSend} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}