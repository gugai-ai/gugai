type ToolCardProps = {
  name: string;
  description: string;
  websiteUrl: string;
  logoUrl: string | null;
  companyName: string;
  verificationStatus?: string;
  capabilityNames?: string[];
};

export default function ToolCard({
  name,
  description,
  websiteUrl,
  logoUrl,
  companyName,
  verificationStatus,
  capabilityNames,
}: ToolCardProps) {
  const showVerified =
    verificationStatus === "VERIFIED";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xl font-medium text-zinc-400">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">
              {name}
            </h3>

            {showVerified && (
              <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-400">
                Capability Verified
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            {companyName}
          </p>

          {capabilityNames && capabilityNames.length > 0 && (
            <p className="mt-3 text-xs text-zinc-400">
              Covers: {capabilityNames.join(", ")}
            </p>
          )}

          <p className="mt-4 text-sm leading-6 text-zinc-400">
            {description}
          </p>

          <div className="mt-5">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Visit website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}