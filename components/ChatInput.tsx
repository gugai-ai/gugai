"use client";

import { useState } from "react";

export default function ChatInput() {
  const [message, setMessage] = useState("");

  function handleSubmit() {
    if (!message.trim()) return;

    console.log("User message:", message);
    setMessage("");
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
      <div className="flex items-center gap-2">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
          type="text"
          placeholder="Tell me what you want to accomplish..."
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
        />

        <button
          onClick={handleSubmit}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          Search
        </button>
      </div>
    </div>
  );
}