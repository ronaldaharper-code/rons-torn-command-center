import type {
  ManualReminderAlert,
  PropertyAdvisorPlan,
  PropertySummary,
  RentalAlert,
} from "@/lib/propertyAdvisor";

interface PropertyAdvisorCardProps {
  plan: PropertyAdvisorPlan;
}

function formatMoney(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return `$${value.toLocaleString()}`;
}

function urgencyBadgeClass(urgency: string): string {
  switch (urgency) {
    case "urgent":
    case "overdue":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "offer-now":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  }
}

function urgencyLabel(urgency: string): string {
  switch (urgency) {
    case "urgent":
      return "Urgent";
    case "overdue":
      return "Overdue";
    case "offer-now":
      return "Offer extension now";
    default:
      return "Upcoming";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "in_use":
      return "In use";
    case "rented":
      return "Rented";
    case "for_rent":
      return "Listed for rent";
    case "none":
      return "Not in use";
    default:
      return status;
  }
}

function PropertyTile({ property }: { property: PropertySummary }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{property.name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">ID {property.id ?? "—"}</p>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-semibold text-slate-300">
          {statusLabel(property.status)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
        {property.happy !== undefined ? (
          <span>Happy: <span className="text-white">{property.happy.toLocaleString()}</span></span>
        ) : null}
        {property.upkeep !== undefined ? (
          <span>Upkeep: <span className="text-white">{formatMoney(property.upkeep)}</span>/day</span>
        ) : null}
        {property.staffUpkeep ? (
          <span>Staff: <span className="text-white">{formatMoney(property.staffUpkeep)}</span>/day</span>
        ) : null}
        {formatMoney(property.marketValue) ? (
          <span>Market value: <span className="text-white">{formatMoney(property.marketValue)}</span></span>
        ) : null}
        <span>Modifications: <span className="text-white">{property.modificationsCount}</span></span>
      </div>

      {property.rental ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
          {property.rental.renterName ? (
            <span>Renter: <span className="text-white">{property.rental.renterName}</span></span>
          ) : null}
          {property.rental.costPerDay !== undefined ? (
            <span>Rent: <span className="text-white">{formatMoney(property.rental.costPerDay)}</span>/day</span>
          ) : null}
          {property.rental.daysRemaining !== undefined ? (
            <span>
              Days remaining: <span className="text-white">{property.rental.daysRemaining}</span>
            </span>
          ) : (
            <span className="text-amber-300">Renter/end-date details unavailable from API</span>
          )}
          {property.rental.extensionOffered ? (
            <span className="text-cyan-300">Extension offer queued{formatMoney(property.rental.extensionCostPerPeriod) ? ` (${formatMoney(property.rental.extensionCostPerPeriod)})` : ""}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RentalAlertRow({ alert }: { alert: RentalAlert }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-white">{alert.property.name}</p>
        <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${urgencyBadgeClass(alert.urgency)}`}>
          {urgencyLabel(alert.urgency)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{alert.reason}</p>
    </div>
  );
}

function ManualReminderRow({ alert }: { alert: ManualReminderAlert }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-white">{alert.reminder.propertyLabel}</p>
        <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${urgencyBadgeClass(alert.urgency)}`}>
          {urgencyLabel(alert.urgency)}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{alert.reason}</p>
      <p className="mt-1 text-xs text-slate-500">
        Manual reminder · ends {alert.reminder.rentalEndDate}
        {alert.reminder.note ? ` · ${alert.reminder.note}` : ""}
      </p>
    </div>
  );
}

export default function PropertyAdvisorCard({ plan }: PropertyAdvisorCardProps) {
  if (!plan.propertyDataAvailable) {
    return (
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h2 className="text-xl font-bold text-white">Property &amp; Rental Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div>
        <h2 className="text-xl font-bold text-white">Property &amp; Rental Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </div>

      {!plan.rentalTimingAvailable && plan.rentedProperties.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
          Property data is available, but renter/end-date details are unavailable from the API for Shenzy&rsquo;s
          rented propert{plan.rentedProperties.length === 1 ? "y" : "ies"}. Add a manual rental reminder below so
          extension timing can still be tracked — we won&rsquo;t guess at days remaining.
        </div>
      ) : null}

      {/* Rental alerts (live API timing) */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Rental timing (live)</h3>
        {plan.rentalAlerts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {plan.rentalAlerts.map((alert) => (
              <RentalAlertRow key={`${alert.property.id ?? alert.property.name}`} alert={alert} />
            ))}
          </div>
        ) : plan.rentedProperties.length > 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No rentals currently need an extension offer based on live timing — thresholds: offer at{" "}
            {plan.extensionReminderDays} days remaining, urgent under {plan.urgentReminderDays}.
          </p>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No properties are currently rented out.
          </p>
        )}
      </div>

      {/* Manual reminders */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Manual rental reminders</h3>
        {plan.manualReminderAlerts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {plan.manualReminderAlerts.map((alert) => (
              <ManualReminderRow key={alert.reminder.id} alert={alert} />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No manual reminders set. {plan.rentalTimingAvailable
              ? "Live API timing covers Shenzy's rented properties — manual reminders are only needed for rentals the API doesn't expose."
              : "Add one in Settings to track a rental's end date when the API doesn't expose it."}
          </p>
        )}
      </div>

      {/* Owned properties */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Owned by Shenzy ({plan.ownedProperties.length})
        </h3>
        {plan.ownedProperties.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No properties are owned directly by Shenzy.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plan.ownedProperties.map((property) => (
              <PropertyTile key={property.id ?? property.name} property={property} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
