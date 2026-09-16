"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatInput from "@/components/ChatInput";
import ChatMessage from "@/components/ChatMessage";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(message: string) {
    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: message,
      },
      {
        role: "assistant",
        content:
          "I understand what you're trying to accomplish. I'm preparing the right AI tools and workflow for you.",
      },
    ]);
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
                    the best stack for your workflow.
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
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={`${message.role}-${index}`}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                <div ref={conversationEndRef} />
              </div>
            )}
          </div>

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