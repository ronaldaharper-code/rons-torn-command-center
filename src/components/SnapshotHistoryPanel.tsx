import type { SnapshotComparison, SnapshotPayload } from "@/lib/torn-types";

interface SnapshotHistoryPanelProps {
  snapshots: SnapshotPayload[];
  weeklyTrend?: SnapshotComparison;
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(iso: string): string {
  return TIMESTAMP_FORMATTER.format(new Date(iso));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatElapsed(ms: number): string {
  const days = ms / (24 * 60 * 60 * 1000);
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = ms / (60 * 60 * 1000);
  return `${hours.toFixed(1)} hours`;
}

function formatDelta(delta: SnapshotComparison["metrics"][number]): string {
  const sign = delta.change > 0 ? "+" : "";
  const base = `${sign}${formatNumber(delta.change)}`;
  if (delta.changePercent === undefined) return base;
  const percentSign = delta.changePercent > 0 ? "+" : "";
  return `${base} (${percentSign}${delta.changePercent.toFixed(1)}%)`;
}

function deltaColor(change: number): string {
  if (change > 0) return "text-emerald-400";
  if (change < 0) return "text-rose-400";
  return "text-slate-400";
}

export default function SnapshotHistoryPanel({ snapshots, weeklyTrend }: SnapshotHistoryPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-xl shadow-black/30">
      <h2 className="text-xl font-bold text-white">Snapshot history</h2>
      <p className="mt-1 text-sm text-slate-400">
        Periodic captures of your stats and net worth. The more you capture, the sharper trends, forecasts, and advisor guidance become.
      </p>

      {weeklyTrend ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/40 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Trend over the last {formatElapsed(weeklyTrend.elapsedMs)}
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyTrend.metrics.map((metric) => (
              <div key={metric.key} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {formatNumber(metric.from)} → {formatNumber(metric.to)}
                </p>
                <p className={`mt-1 text-sm font-semibold ${deltaColor(metric.change)}`}>{formatDelta(metric)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          Not enough snapshot history yet to show a trend — capture a few snapshots a week apart to unlock this.
        </p>
      )}

      {snapshots.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
          No snapshots captured yet. Use the &quot;Capture snapshot&quot; button on your dashboard to start building history.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Captured</th>
                <th className="py-2 pr-4 font-medium">Net worth</th>
                <th className="py-2 pr-4 font-medium">Cash</th>
                <th className="py-2 pr-4 font-medium">Battle stats</th>
                <th className="py-2 pr-4 font-medium">Points</th>
                <th className="py-2 pr-4 font-medium">Merits</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr key={snapshot.capturedAt} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-medium text-white">{formatTimestamp(snapshot.capturedAt)}</td>
                  <td className="py-3 pr-4 text-slate-300">{formatNumber(snapshot.netWorth)}</td>
                  <td className="py-3 pr-4 text-slate-300">{formatNumber(snapshot.cash)}</td>
                  <td className="py-3 pr-4 text-slate-300">
                    {snapshot.battleStatsTotal !== undefined ? formatNumber(snapshot.battleStatsTotal) : "—"}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">{formatNumber(snapshot.points)}</td>
                  <td className="py-3 pr-4 text-slate-300">{formatNumber(snapshot.merits)}</td>
                  <td className="py-3 pr-4 text-slate-300 capitalize">{snapshot.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
