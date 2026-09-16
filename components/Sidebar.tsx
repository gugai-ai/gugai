export default function Sidebar() {
  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 sm:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-zinc-800 px-2 sm:justify-start sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white font-bold text-black">
            G
          </div>

          <span className="hidden text-xl font-semibold tracking-tight sm:inline">
            Gugai
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-5 sm:px-3">
        <div className="mb-3 hidden px-3 text-xs font-medium uppercase tracking-wider text-zinc-500 sm:block">
          Discover
        </div>

        <button aria-label="Home" className="mb-1 flex w-full items-center justify-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-medium sm:justify-start">
          <span aria-hidden="true">⌂</span>
          <span className="hidden sm:inline">Home</span>
        </button>

        <button aria-label="Explore" className="mb-1 flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:justify-start">
          <span aria-hidden="true">⌕</span>
          <span className="hidden sm:inline">Explore</span>
        </button>

        <button aria-label="Workflows" className="mb-1 flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:justify-start">
          <span aria-hidden="true">◇</span>
          <span className="hidden sm:inline">Workflows</span>
        </button>

        <div className="mb-3 mt-8 hidden px-3 text-xs font-medium uppercase tracking-wider text-zinc-500 sm:block">
          Your Space
        </div>

        <button aria-label="Saved" className="mb-1 flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:justify-start">
          <span aria-hidden="true">♡</span>
          <span className="hidden sm:inline">Saved</span>
        </button>

        <button aria-label="Recent Chats" className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:justify-start">
          <span aria-hidden="true">◷</span>
          <span className="hidden sm:inline">Recent Chats</span>
        </button>
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-800 p-2 sm:p-4">
        <button aria-label="Help and Feedback" className="flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white sm:justify-start">
          <span aria-hidden="true">?</span>
          <span className="hidden sm:inline">Help & Feedback</span>
        </button>
      </div>
    </aside>
  );
}