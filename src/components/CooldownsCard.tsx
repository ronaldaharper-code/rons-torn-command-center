import type { CooldownEntry, CooldownState } from "@/lib/torn-types";

interface CooldownsCardProps {
  cooldowns: CooldownEntry[];
}

const STATE_STYLES: Record<CooldownState, { label: string; badge: string }> = {
  ready: { label: "Ready", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  waiting: { label: "Waiting", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  unavailable: { label: "Unavailable", badge: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

export default function CooldownsCard({ cooldowns }: CooldownsCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white">Cooldowns &amp; Travel</h2>
        <p className="mt-1 text-sm text-slate-400">Drug, booster, medical, crime, and mission timers — plus your travel status.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cooldowns.map((entry) => {
          const style = STATE_STYLES[entry.state];
          return (
            <div key={entry.key} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{entry.label}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
                  {style.label}
                </span>
              </div>
              {entry.detail ? <p className="mt-2 text-xs text-slate-400">{entry.detail}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
