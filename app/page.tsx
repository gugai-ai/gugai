import Sidebar from "@/components/Sidebar";
import ChatInput from "@/components/ChatInput";

export default function Home() {
  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar />

      <main className="flex flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-zinc-800 px-6">
          <h1 className="text-lg font-semibold">AI Stack Intelligence</h1>
        </header>

        <section className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-3xl text-center">
            <p className="mb-3 text-sm font-medium text-zinc-500">
              GUGAI
            </p>

            <h2 className="text-4xl font-semibold tracking-tight">
              Tell us what you want to accomplish.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Gugai finds the right AI tools, compares them, and builds the
              best stack for your workflow.
            </p>

            <div className="mt-8">
            <ChatInput />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}