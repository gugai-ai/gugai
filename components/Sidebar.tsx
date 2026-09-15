export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-zinc-800 px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-black">
            G
          </div>

          <span className="text-xl font-semibold tracking-tight">
            Gugai
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">
        <div className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Discover
        </div>

        <button className="mb-1 flex w-full items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-medium">
          <span>⌂</span>
          Home
        </button>

        <button className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <span>⌕</span>
          Explore
        </button>

        <button className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <span>◇</span>
          Workflows
        </button>

        <div className="mb-3 mt-8 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Your Space
        </div>

        <button className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <span>♡</span>
          Saved
        </button>

        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <span>◷</span>
          Recent Chats
        </button>
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white">
          <span>?</span>
          Help & Feedback
        </button>
      </div>
    </aside>
  );
}