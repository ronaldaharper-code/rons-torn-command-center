import type { GarageAdvisorPlan, GarageCarStats, GarageCarSummary } from "@/lib/garageAdvisor";

interface GarageAdvisorCardProps {
  plan: GarageAdvisorPlan;
}

const STAT_DISPLAY: { key: keyof GarageCarStats; label: string }[] = [
  { key: "topSpeed", label: "Speed" },
  { key: "acceleration", label: "Accel" },
  { key: "braking", label: "Braking" },
  { key: "handling", label: "Handling" },
  { key: "safety", label: "Safety" },
  { key: "dirt", label: "Dirt" },
  { key: "tarmac", label: "Tarmac" },
];

function formatMoney(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return `$${value.toLocaleString()}`;
}

function classBadgeClass(carClass: string | undefined): string {
  if ((carClass ?? "").toUpperCase() === "C") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  return "border-white/10 bg-white/5 text-slate-300";
}

function CarTile({ car, emphasis }: { car: GarageCarSummary; emphasis?: "best" | "weak" }) {
  const emphasisClass =
    emphasis === "best"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : emphasis === "weak"
        ? "border-amber-500/20 bg-amber-500/5"
        : "border-white/5 bg-black/20";

  const statEntries = STAT_DISPLAY.map(({ key, label }) => ({ label, value: car.stats[key] })).filter(
    (entry) => typeof entry.value === "number",
  );

  return (
    <div className={`rounded-xl border p-3 ${emphasisClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{car.name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            ID {car.id ?? "—"}
            {car.carItemId ? ` · Car item ${car.carItemId}` : ""}
          </p>
        </div>
        {car.class ? (
          <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold ${classBadgeClass(car.class)}`}>
            Class {car.class}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
        <span>
          Races: <span className="text-white">{car.racesEntered}</span> entered ·{" "}
          <span className="text-white">{car.racesWon}</span> won
          {car.winRate !== undefined ? <span className="text-white"> ({(car.winRate * 100).toFixed(0)}%)</span> : null}
        </span>
        {formatMoney(car.worth) ? <span>Worth: <span className="text-white">{formatMoney(car.worth)}</span></span> : null}
        {car.pointsSpent !== undefined ? (
          <span>Points spent: <span className="text-white">{car.pointsSpent}</span></span>
        ) : null}
      </div>

      {statEntries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
          {statEntries.map((entry) => (
            <span key={entry.label}>
              {entry.label}: <span className="text-white">{entry.value}</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No stat detail reported for this car.</p>
      )}

      <p className="mt-2 text-sm text-slate-500">
        {car.partsInstalled} part{car.partsInstalled === 1 ? "" : "s"} installed — upgrade details unavailable from API.
      </p>
    </div>
  );
}

export default function GarageAdvisorCard({ plan }: GarageAdvisorCardProps) {
  if (!plan.garageDataAvailable) {
    return (
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h2 className="text-xl font-bold text-white">Racing Garage Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div>
        <h2 className="text-xl font-bold text-white">Racing Garage Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
        Upgrade and part details are unavailable from the API at this key&rsquo;s access level — Torn&rsquo;s upgrade catalog
        endpoints (<code>carupgrades</code>, <code>racing/cars</code>) return &ldquo;access level not high enough&rdquo;. Each
        car below shows how many parts are installed (a count from the data we do have), but not what they are or whether
        they&rsquo;re the right ones. We won&rsquo;t fabricate exact upgrade advice — review installed parts in-game before
        making changes.
      </div>

      {/* Best car */}
      {plan.bestCar ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Best racing car</h3>
          <div className="mt-3">
            <CarTile car={plan.bestCar.car} emphasis="best" />
            <p className="mt-2 text-sm text-slate-400">{plan.bestCar.reason}</p>
          </div>
        </div>
      ) : null}

      {/* Weak areas */}
      {plan.weakAreas.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Weak areas worth reviewing</h3>
          <div className="mt-3 space-y-2">
            {plan.weakAreas.map((weak) => (
              <div key={`${weak.car.id ?? weak.car.name}-${weak.statLabel}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="font-medium text-white">
                  {weak.car.name} — {weak.statLabel} (review recommended)
                </p>
                <p className="mt-1 text-sm text-slate-400">{weak.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Class C focus */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Class C cars</h3>
        {plan.classCCars.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No Class C cars currently enlisted.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {plan.classCCars.map((car) => (
              <CarTile key={car.id ?? car.name} car={car} />
            ))}
          </div>
        )}
      </div>

      {/* Full garage */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">All enlisted cars</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plan.cars.map((car) => (
            <CarTile key={car.id ?? car.name} car={car} />
          ))}
        </div>
      </div>
    </section>
  );
}
