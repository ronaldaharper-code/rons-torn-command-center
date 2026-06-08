import type { ConsumableUsageEstimate } from "@/lib/torn-types";

interface ConsumableUsagePanelProps {
  estimates: ConsumableUsageEstimate[];
}

function formatPerDay(value?: number): string {
  if (value === undefined) return "—";
  if (value === 0) return "0 / day";
  return `${value.toFixed(1)} / day`;
}

export default function ConsumableUsagePanel({ estimates }: ConsumableUsagePanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <h2 className="text-xl font-bold text-white">Consumable usage</h2>
      <p className="mt-1 text-sm text-slate-400">
        Estimated burn rate for watched items, based on Snapshot history. Capture snapshots regularly from your dashboard to sharpen these estimates.
      </p>

      {estimates.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          Add items to your watchlist to see usage estimates here.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Item</th>
                <th className="py-2 pr-4 font-medium">On hand</th>
                <th className="py-2 pr-4 font-medium">7-day usage</th>
                <th className="py-2 pr-4 font-medium">30-day usage</th>
                <th className="py-2 pr-4 font-medium">Est. days remaining</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((estimate) => (
                <tr key={estimate.itemName} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-white">{estimate.itemName}</td>
                  <td className="py-3 pr-4 text-slate-300">{estimate.currentQuantity}</td>
                  {estimate.hasEnoughHistory ? (
                    <>
                      <td className="py-3 pr-4 text-slate-300">{formatPerDay(estimate.dailyUsage7d)}</td>
                      <td className="py-3 pr-4 text-slate-300">{formatPerDay(estimate.dailyUsage30d)}</td>
                      <td className="py-3 pr-4 text-slate-300">
                        {estimate.daysRemaining !== undefined ? `~${Math.round(estimate.daysRemaining)} days` : "—"}
                      </td>
                    </>
                  ) : (
                    <td colSpan={3} className="py-3 pr-4 text-slate-500">
                      Not enough snapshot history yet — capture a few snapshots over time to unlock usage estimates.
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
