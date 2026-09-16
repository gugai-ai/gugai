"use client";

import { useState } from "react";

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) return;

    onSend(trimmedMessage);
    setMessage("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/20 transition focus-within:border-zinc-600"
    >
      <div className="flex items-end gap-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          disabled={disabled}
          rows={1}
          placeholder="Tell me what you want to accomplish..."
          aria-label="Message Gugai"
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500 sm:px-5"
        >
          Send
        </button>
      </div>
      <p className="px-4 pb-1 pt-1 text-[11px] text-zinc-600">
        Press Enter to send · Shift+Enter for a new line
      </p>
    </form>
  );
}