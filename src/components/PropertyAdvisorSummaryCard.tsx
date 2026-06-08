import Link from "next/link";
import type { PropertyAdvisorPlan } from "@/lib/propertyAdvisor";

interface PropertyAdvisorSummaryCardProps {
  plan: PropertyAdvisorPlan;
}

export default function PropertyAdvisorSummaryCard({ plan }: PropertyAdvisorSummaryCardProps) {
  const urgentCount = plan.rentalAlerts.filter((alert) => alert.urgency === "urgent").length;
  const offerNowCount = plan.rentalAlerts.filter((alert) => alert.urgency === "offer-now").length;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Property &amp; Rental Advisor</h2>
          <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
        </div>
        <Link
          href="/dashboard/properties"
          className="inline-flex shrink-0 items-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
        >
          View properties →
        </Link>
      </div>

      {plan.propertyDataAvailable ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Owned properties</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan.ownedProperties.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Currently rented</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan.rentedProperties.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Need attention</p>
            <p className={`mt-1 text-lg font-semibold ${urgentCount > 0 ? "text-red-300" : offerNowCount > 0 ? "text-amber-300" : "text-slate-400"}`}>
              {urgentCount + offerNowCount}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
