import type { GearAdvisorPlan, GearPiece } from "@/lib/gearAdvisor";

interface GearAdvisorCardProps {
  plan: GearAdvisorPlan;
}

function formatMoney(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return `$${value.toLocaleString()}`;
}

function rarityClass(rarity: string | null | undefined): string {
  if (rarity === "yellow") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (rarity === "orange") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (rarity === "red") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-white/10 bg-white/5 text-slate-300";
}

function GearPieceTile({ piece, emphasis }: { piece: GearPiece; emphasis?: "strongest" | "weakest" | "review" }) {
  const emphasisClass =
    emphasis === "strongest"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : emphasis === "weakest"
        ? "border-rose-500/20 bg-rose-500/5"
        : emphasis === "review"
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-white/5 bg-black/20";

  const stats = piece.stats;
  const statEntries: { label: string; value: number | null | undefined }[] = stats
    ? [
        { label: "Damage", value: stats.damage },
        { label: "Accuracy", value: stats.accuracy },
        { label: "Armor", value: stats.armor },
        { label: "Quality", value: stats.quality },
      ].filter((entry) => entry.value !== null && entry.value !== undefined)
    : [];

  return (
    <div className={`rounded-xl border p-3 ${emphasisClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{piece.name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {piece.category}
            {piece.subType ? ` · ${piece.subType}` : ""}
          </p>
        </div>
        {piece.rarity ? (
          <span className={`rounded-lg border px-2 py-0.5 text-xs font-semibold capitalize ${rarityClass(piece.rarity)}`}>
            {piece.rarity}
          </span>
        ) : null}
      </div>

      {formatMoney(piece.marketValue) ? (
        <p className="mt-2 text-sm text-slate-400">Market value: {formatMoney(piece.marketValue)}</p>
      ) : null}

      {piece.detailAvailable ? (
        <>
          {statEntries.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
              {statEntries.map((entry) => (
                <span key={entry.label}>
                  {entry.label}: <span className="text-white">{entry.value!.toFixed(2)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No stat detail reported for this item.</p>
          )}
          {piece.bonuses.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {piece.bonuses.map((bonus, index) => (
                <li key={`${bonus.title}-${index}`} className="text-sm text-slate-400">
                  <span className="font-medium text-cyan-300">{bonus.title}</span>
                  {bonus.description ? <span> — {bonus.description}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No named bonus on this item.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Bonus and quality detail unavailable from API for this item.</p>
      )}
    </div>
  );
}

function SlotSummary({ label, piece }: { label: string; piece?: GearPiece }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {piece ? (
        <>
          <p className="mt-1 font-medium text-white">{piece.name}</p>
          {formatMoney(piece.marketValue) ? <p className="text-sm text-slate-400">{formatMoney(piece.marketValue)}</p> : null}
        </>
      ) : (
        <p className="mt-1 text-sm text-rose-300">Empty</p>
      )}
    </div>
  );
}

export default function GearAdvisorCard({ plan }: GearAdvisorCardProps) {
  if (!plan.equipmentDataAvailable) {
    return (
      <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
        <h2 className="text-xl font-bold text-white">Gear Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </section>
    );
  }

  const { loadout } = plan;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div>
        <h2 className="text-xl font-bold text-white">Gear Advisor</h2>
        <p className="mt-1 text-sm font-medium text-slate-200">{plan.headline}</p>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{plan.summary}</p>
      </div>

      <p className="mt-4 text-sm text-slate-400">{plan.battleStatsNote}</p>

      {!plan.bonusDataAvailable ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
          Gear data is available, but bonus and quality details aren&rsquo;t being returned by the API right now — bonuses
          below are shown as unavailable rather than guessed.
        </div>
      ) : null}

      {/* Quick loadout summary */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SlotSummary label="Primary weapon" piece={loadout.primary} />
        <SlotSummary label="Secondary weapon" piece={loadout.secondary} />
        <SlotSummary label="Melee" piece={loadout.melee} />
        <SlotSummary label="Temporary" piece={loadout.temporary} />
      </div>

      {/* Missing slots */}
      {plan.missingSlots.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Missing slots</h3>
          <div className="mt-3 space-y-2">
            {plan.missingSlots.map((slot) => (
              <div key={slot.key} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                <p className="font-medium text-white">{slot.label}</p>
                <p className="mt-1 text-sm text-slate-400">{slot.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Strongest / weakest */}
      {(plan.strongest || plan.weakest) ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plan.strongest ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-400">Strongest piece</p>
              <p className="mt-1 font-medium text-white">{plan.strongest.item.name}</p>
              <p className="mt-1 text-sm text-slate-400">{plan.strongest.reason}</p>
            </div>
          ) : null}
          {plan.weakest ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-400">Weakest piece</p>
              <p className="mt-1 font-medium text-white">{plan.weakest.item.name}</p>
              <p className="mt-1 text-sm text-slate-400">{plan.weakest.reason}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Review recommended */}
      {plan.reviewRecommended.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Review recommended</h3>
          <div className="mt-3 space-y-2">
            {plan.reviewRecommended.map((highlight) => (
              <div key={highlight.item.uid ?? highlight.item.name} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="font-medium text-white">{highlight.item.name}</p>
                <p className="mt-1 text-sm text-slate-400">{highlight.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Full loadout */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Weapons</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[loadout.primary, loadout.secondary, loadout.melee, loadout.temporary].filter(Boolean).map((piece) => (
            <GearPieceTile key={piece!.uid ?? piece!.name} piece={piece!} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Armor</h3>
        {loadout.armor.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-400">
            No armor equipped.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loadout.armor.map((piece) => (
              <GearPieceTile key={piece.uid ?? piece.name} piece={piece} />
            ))}
          </div>
        )}
      </div>

      {loadout.other.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Clothing &amp; enhancers</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {loadout.other.map((piece) => (
              <GearPieceTile key={piece.uid ?? piece.name} piece={piece} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
