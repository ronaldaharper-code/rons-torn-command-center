import { inventoryQuantity } from "@/lib/torn";
import type { TornItemInventory, WatchedItem } from "@/lib/torn-types";

interface ConsumablesStatusCardProps {
  watchlist: WatchedItem[];
  inventory?: TornItemInventory;
}

type StockStatus = "ok" | "low" | "out";

const STATUS_STYLES: Record<StockStatus, { label: string; badge: string }> = {
  ok: { label: "Stocked", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  low: { label: "Low", badge: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  out: { label: "Out", badge: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

function stockStatus(onHand: number, minTarget: number): StockStatus {
  if (onHand <= 0) return "out";
  if (onHand < minTarget) return "low";
  return "ok";
}

export default function ConsumablesStatusCard({ watchlist, inventory }: ConsumablesStatusCardProps) {
  const rows = watchlist
    .filter((item) => item.alertEnabled)
    .map((item) => {
      const onHand = inventoryQuantity(inventory, item.itemName);
      return { item, onHand, status: stockStatus(onHand, item.minTarget) };
    });

  const lowOrOut = rows.filter((row) => row.status !== "ok");

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Consumables</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live inventory counts for your watchlist, compared against the minimum targets set in Settings.
          </p>
        </div>
        {lowOrOut.length > 0 ? (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            {lowOrOut.length} low or out
          </span>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          Add items to your watchlist in Settings to track live stock levels here.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Item</th>
                <th className="py-2 pr-4 font-medium">On hand</th>
                <th className="py-2 pr-4 font-medium">Target</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, onHand, status }) => {
                const style = STATUS_STYLES[status];
                return (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-white">{item.itemName}</td>
                    <td className="py-3 pr-4 text-slate-300">{onHand}</td>
                    <td className="py-3 pr-4 text-slate-300">{item.minTarget}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.badge}`}>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
