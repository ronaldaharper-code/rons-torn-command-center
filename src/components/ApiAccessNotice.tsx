import type { TornAccessEntry } from "@/lib/torn-types";

interface ApiAccessNoticeProps {
  access: TornAccessEntry[];
}

export default function ApiAccessNotice({ access }: ApiAccessNoticeProps) {
  const missing = access.filter((entry) => entry.status !== "ok");
  if (missing.length === 0) return null;

  return (
    <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h2 className="text-sm font-semibold text-amber-300">Some data requires additional API access</h2>
      <p className="mt-1 text-xs text-amber-200/70">
        Your Torn API key doesn&apos;t currently expose everything this dashboard can use. The features below will stay
        hidden or show placeholders until you generate a key with broader access (Torn → Settings → API Keys).
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-amber-200/80 sm:grid-cols-3">
        {missing.map((entry) => (
          <li key={entry.selection} className="flex items-center justify-between gap-2">
            <span>{entry.label}</span>
            <span className="text-amber-400/60">
              {entry.status === "denied" ? "needs more access" : entry.status === "unavailable" ? "unavailable" : "error"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
