import Link from "next/link";
import type { GearAdvisorPlan } from "@/lib/gearAdvisor";

interface GearAdvisorSummaryCardProps {
  plan: GearAdvisorPlan;
}

export default function GearAdvisorSummaryCard({ plan }: GearAdvisorSummaryCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gear Advisor</h2>
          <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
        </div>
        <Link
          href="/dashboard/gear"
          className="inline-flex shrink-0 items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
        >
          View full loadout →
        </Link>
      </div>

      {plan.equipmentDataAvailable ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Missing slots</p>
            <p className={`mt-1 text-lg font-semibold ${plan.missingSlots.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {plan.missingSlots.length}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Strongest piece</p>
            <p className="mt-1 text-sm font-medium text-white">{plan.strongest?.item.name ?? "Unavailable"}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Review recommended</p>
            <p className={`mt-1 text-lg font-semibold ${plan.reviewRecommended.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {plan.reviewRecommended.length}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
