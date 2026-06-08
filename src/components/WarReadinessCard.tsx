import type { ReadyByWarStart, WarReadinessPlan } from "@/lib/warReadiness";

interface WarReadinessCardProps {
  plan: WarReadinessPlan;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function readyByBadge(value: ReadyByWarStart): { label: string; className: string } {
  if (value === true) return { label: "Yes", className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" };
  if (value === false) return { label: "No", className: "border-rose-500/30 bg-rose-500/15 text-rose-300" };
  return { label: "Uncertain", className: "border-amber-500/30 bg-amber-500/15 text-amber-300" };
}

function severityClass(severity: "critical" | "high" | "medium"): string {
  if (severity === "critical") return "border-rose-500/20 bg-rose-500/5";
  if (severity === "high") return "border-amber-500/20 bg-amber-500/5";
  return "border-white/5 bg-black/20";
}

export default function WarReadinessCard({ plan }: WarReadinessCardProps) {
  const badge = readyByBadge(plan.readyByWarStart);

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">War Readiness Countdown</h2>
          <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Readiness score</p>
          <p className={`text-3xl font-bold ${scoreColor(plan.score)}`}>{plan.score}/100</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ready now</p>
          <p className={`mt-1 text-lg font-semibold ${plan.readyNow ? "text-emerald-400" : "text-rose-400"}`}>
            {plan.readyNow ? "Yes" : "No"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Ready by war start</p>
          <p className={`mt-1 inline-flex rounded-lg border px-2 py-0.5 text-sm font-semibold ${badge.className}`}>
            {badge.label}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Time until war</p>
          <p className="mt-1 text-lg font-semibold text-white">{plan.warTime.timeUntil ?? "Not set"}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">War start</p>
          {plan.warTime.tct ? (
            <>
              <p className="mt-1 text-sm text-white">{plan.warTime.tct}</p>
              <p className="text-sm text-slate-400">{plan.warTime.local}</p>
              <p className="mt-1 text-xs text-slate-500">
                {plan.warTime.source === "api" ? "From Torn faction data" : "From your manual setting"}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Set a start time in Settings</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Blocking issues</h3>
        {plan.blockingIssues.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No blocking issues detected right now.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {plan.blockingIssues.map((issue) => (
              <div key={issue.key} className={`rounded-xl border p-3 ${severityClass(issue.severity)}`}>
                <p className="font-medium text-white">{issue.label}</p>
                <p className="mt-1 text-sm text-slate-400">{issue.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {plan.recommendedActions.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recommended actions</h3>
          <ul className="mt-3 space-y-2">
            {plan.recommendedActions.map((action) => (
              <li key={action.key} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <p className="font-medium text-white">{action.label}</p>
                <p className="mt-1 text-sm text-slate-400">{action.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Vicodin timing</h3>
        <p className="mt-2 font-medium text-white">{plan.vicodinGuidance.headline}</p>
        <p className="mt-1 text-sm text-slate-400">{plan.vicodinGuidance.detail}</p>
      </div>
    </section>
  );
}
