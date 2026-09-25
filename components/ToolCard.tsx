type ToolCardProps = {
  name: string;
  description: string;
  websiteUrl: string;
  logoUrl: string | null;
  companyName: string;
  verificationStatus: string;
};

export default function ToolCard({
  name,
  description,
  websiteUrl,
  logoUrl,
  companyName,
  verificationStatus,
}: ToolCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-lg font-semibold text-zinc-400">
              {name.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{name}</h3>

            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {verificationStatus.replace("_", " ")}
            </span>
          </div>

          <p className="mt-1 text-xs text-zinc-500">{companyName}</p>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {description}
          </p>

          <div className="mt-4">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Visit website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}