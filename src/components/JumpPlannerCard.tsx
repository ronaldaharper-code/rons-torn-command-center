import type { JumpPlan, JumpPhase, JumpStep, JumpCooldownStatus } from "@/lib/jumpPlanner";

interface Props {
  plan: JumpPlan;
}

// ─── Phase badge ──────────────────────────────────────────────────────────

const PHASE_BADGE: Record<JumpPhase, { label: string; classes: string }> = {
  "take-ecstasy": {
    label: "Take Ecstasy now",
    classes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  "stacking-happy": {
    label: "Stacking happy",
    classes: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  "building-energy": {
    label: "Building energy",
    classes: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  },
  "post-first-train": {
    label: "Use point refill",
    classes: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  },
  "missing-ecstasy": {
    label: "Blocked — no Ecstasy",
    classes: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
};

// ─── Subcomponents ────────────────────────────────────────────────────────

function EnergyBar({
  current,
  maximum,
  target,
  ideal,
}: {
  current: number;
  maximum: number;
  target: number;
  ideal: number;
}) {
  const cap = Math.max(maximum, ideal);
  const fillPct = cap > 0 ? Math.min(100, (current / cap) * 100) : 0;
  const targetPct = cap > 0 ? Math.min(100, (target / cap) * 100) : 0;
  const idealPct = cap > 0 ? Math.min(100, (ideal / cap) * 100) : 0;
  const targetMet = current >= target;
  const idealMet = current >= ideal;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>Energy</span>
        <span>{current.toLocaleString()} / {maximum.toLocaleString()} (natural max)</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${targetMet ? "bg-emerald-400" : "bg-sky-400"}`}
          style={{ width: `${fillPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-400/80"
          style={{ left: `${targetPct}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-white/25"
          style={{ left: `${idealPct}%` }}
        />
      </div>
      <div className="mt-1 flex gap-3 text-xs">
        <span className={targetMet ? "text-emerald-300" : "text-amber-300"}>
          {targetMet ? "✓" : "!"} {target} target
        </span>
        <span className={idealMet ? "text-emerald-300" : "text-slate-500"}>
          {idealMet ? "✓" : "○"} {ideal} ideal
        </span>
      </div>
    </div>
  );
}

function HappyBar({ current, maximum }: { current: number; maximum: number }) {
  const pct = maximum > 0 ? Math.min(100, (current / maximum) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>Happy</span>
        <span>{current.toLocaleString()} / {maximum.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-pink-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">Goal: maximize before training. No fixed target.</p>
    </div>
  );
}

function CooldownRow({ label, cd }: { label: string; cd: JumpCooldownStatus }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${cd.isReady ? "text-emerald-300" : "text-amber-300"}`}>
          {cd.isReady ? "Ready" : cd.detail}
        </span>
        {cd.clearsAt && (
          <p className="mt-0.5 text-xs text-slate-500">
            {cd.clearsAt.tct} · {cd.clearsAt.local}
          </p>
        )}
      </div>
    </div>
  );
}

function InventoryPill({
  label,
  count,
  warn = false,
}: {
  label: string;
  count: number;
  warn?: boolean;
}) {
  const isEmpty = count === 0;
  return (
    <div
      className={`rounded-2xl border p-3 text-center ${
        isEmpty && warn
          ? "border-rose-500/30 bg-rose-950/30"
          : "border-white/10 bg-slate-900/50"
      }`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${isEmpty && warn ? "text-rose-300" : "text-white"}`}>
        {count}
      </p>
    </div>
  );
}

const STEP_ICON: Record<JumpStep["status"], string> = {
  done: "✓",
  active: "→",
  pending: "○",
  unavailable: "–",
};

const STEP_ICON_CLASSES: Record<JumpStep["status"], string> = {
  done: "bg-emerald-500/20 text-emerald-300",
  active: "bg-amber-500/20 text-amber-300",
  pending: "bg-slate-800 text-slate-500",
  unavailable: "bg-slate-800/50 text-slate-600",
};

function StepRow({ step, index }: { step: JumpStep; index: number }) {
  const dim = step.status === "pending" || step.status === "unavailable";
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STEP_ICON_CLASSES[step.status]}`}
      >
        {STEP_ICON[step.status]}
      </span>
      <div className="flex-1">
        <p className={`text-sm font-medium ${dim ? "text-slate-500" : "text-white"}`}>
          {index + 1}. {step.label}
        </p>
        {step.detail && (
          <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
        )}
      </div>
    </li>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────

export default function JumpPlannerCard({ plan }: Props) {
  const badge = PHASE_BADGE[plan.phase];

  return (
    <div className="space-y-6">

      {/* Status + next action */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{plan.phaseLabel}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{plan.nextAction}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>

        {plan.blockerClearsAt && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-950/20 px-4 py-3">
            <p className="text-xs text-amber-300">
              <span className="font-semibold">{plan.blockerLabel}</span> clears in{" "}
              <span className="font-semibold">{plan.blockerClearsIn}</span>
              {" — "}
              <span className="font-semibold">{plan.blockerClearsAt.tct}</span>
              {" / "}
              <span className="font-semibold">{plan.blockerClearsAt.local}</span>
            </p>
          </div>
        )}

        {plan.phase === "post-first-train" && (
          <div className="mt-4 rounded-2xl border border-slate-500/20 bg-slate-900/40 px-4 py-3">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Inferred</span> — energy is below{" "}
              {plan.energyTarget - 1} and drug cooldown is active, which suggests the first training
              cycle just completed. If that&rsquo;s not the case, reload the page for a fresh read.
            </p>
          </div>
        )}
      </section>

      {/* Vitals */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="mb-4 text-lg font-bold text-white">Vitals</h3>
        <div className="space-y-5">
          <EnergyBar
            current={plan.energy.current}
            maximum={plan.energy.maximum}
            target={plan.energyTarget}
            ideal={plan.energyIdeal}
          />
          <HappyBar current={plan.happy.current} maximum={plan.happy.maximum} />
        </div>
      </section>

      {/* Cooldowns */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="mb-4 text-lg font-bold text-white">Cooldowns</h3>
        <div className="space-y-2">
          <CooldownRow label="Drug cooldown" cd={plan.drugCooldown} />
          <CooldownRow label="Booster cooldown" cd={plan.boosterCooldown} />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Clearance times shown in TCT (UTC) and your configured local time zone. Daylight saving is handled automatically.
        </p>
      </section>

      {/* Inventory */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="mb-4 text-lg font-bold text-white">Inventory &amp; points</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <InventoryPill label="Xanax" count={plan.inventory.xanax} warn={plan.inventory.xanax === 0} />
          <InventoryPill label="Ecstasy" count={plan.inventory.ecstasy} warn />
          <InventoryPill label="Candy" count={plan.inventory.candy} />
          <InventoryPill label="Erotic DVD" count={plan.inventory.eroticDvd} />
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-center">
            <p className="text-xs text-slate-400">Points</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {plan.points > 0 ? plan.points.toLocaleString() : "—"}
            </p>
          </div>
        </div>

        {plan.edcBenefitAvailable ? (
          <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
            <p className="text-sm text-emerald-300">
              <span className="font-semibold">EDC stock benefit available</span> — adds +3,000 happy.
              Use it before training, then mark as used in Settings.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            EDC benefit marked as used. Update in Settings when it resets.
          </p>
        )}
      </section>

      {/* Training focus */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="mb-1 text-lg font-bold text-white">Training focus</h3>
        <p className="mb-4 text-sm text-slate-400">
          Stats to train this month. Configure in Settings to change.
        </p>
        <div className="flex flex-wrap gap-2">
          {plan.trainingFocusStats.map((stat) => (
            <span
              key={stat}
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-sm font-semibold text-cyan-300"
            >
              {stat.charAt(0).toUpperCase() + stat.slice(1)}
            </span>
          ))}
        </div>
      </section>

      {/* Step sequence */}
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h3 className="mb-1 text-lg font-bold text-white">Jump sequence</h3>
        <p className="mb-5 text-sm text-slate-400">
          Current position in the 7-step process, based on live API data.
        </p>
        <ol className="space-y-4">
          {plan.steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} />
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-600">
          Steps marked — cannot be confirmed from the Torn API and are shown for reference only.
        </p>
      </section>

    </div>
  );
}
