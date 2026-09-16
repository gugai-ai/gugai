type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatMessage({
  role,
  content,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      aria-label={`${isUser ? "Your" : "Gugai"} message`}
    >
      <div
        className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-2xl ${
          isUser
            ? "bg-white text-black shadow-white/5"
            : "border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-black/20"
        }`}
      >
        {content}
      </div>
    </div>
  );
}