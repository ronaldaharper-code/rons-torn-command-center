import type { JumpPlan, JumpReadiness } from "@/lib/jumpPlanner";

interface JumpPlannerCardProps {
  plan: JumpPlan;
}

const READINESS_STYLES: Record<JumpReadiness, { label: string; badge: string }> = {
  ready: { label: "Train now", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  prepare: { label: "Prepare for jump", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  wait: { label: "Wait & regenerate", badge: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

function VitalBar({ label, current, maximum }: { label: string; current: number; maximum: number }) {
  const percentage = maximum > 0 ? Math.min(100, (current / maximum) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>
          {current.toLocaleString()}/{maximum.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default function JumpPlannerCard({ plan }: JumpPlannerCardProps) {
  const style = READINESS_STYLES[plan.readiness];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{plan.headline}</h2>
            <p className="mt-1 text-sm text-slate-400">{plan.summary}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
            {style.label}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <VitalBar label="Energy" current={plan.energy.current} maximum={plan.energy.maximum} />
          <VitalBar label="Happy" current={plan.happy.current} maximum={plan.happy.maximum} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">Xanax</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan.xanaxCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">Ecstasy</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan.ecstasyCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">Candy</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan.candyCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="text-lg font-bold text-white">Jump requirements</h3>
        <p className="mt-1 text-sm text-slate-400">What needs to line up for an efficient happy jump.</p>
        <ul className="mt-4 space-y-3">
          {plan.requirements.map((requirement) => (
            <li key={requirement.key} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  requirement.met ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {requirement.met ? "✓" : "!"}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{requirement.label}</p>
                <p className="text-xs text-slate-400">{requirement.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="text-lg font-bold text-white">Battle stats</h3>
        <p className="mt-1 text-sm text-slate-400">
          Total: {plan.battleStatsTotal != null ? plan.battleStatsTotal.toLocaleString() : "—"} — distribution across the four core stats.
        </p>
        <div className="mt-4 space-y-3">
          {plan.battleStatShares.map((share) => (
            <div key={share.key}>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{share.label}</span>
                <span>
                  {share.value.toLocaleString()} ({share.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${share.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
