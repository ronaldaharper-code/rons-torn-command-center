import type { AdminSummary } from "@/lib/torn-types";
import { Card } from "./ui/Card";
import { getPriorityMessages } from "@/lib/torn";

interface AdminDashboardProps {
  summary: AdminSummary;
}

function formatCount(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

function readinessLabel(value?: number) {
  if (value === undefined) return "Unknown";
  if (value > 80) return "Ready";
  if (value > 50) return "Almost ready";
  return "Not ready";
}

export function AdminDashboard({ summary }: AdminDashboardProps) {
  const priorities = getPriorityMessages(summary);
  const readiness = readinessLabel(summary.energy);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-zinc-950/90 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Ron’s Torn Command Center</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Private Command Center</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Your admin dashboard with a private summary, inventory health, readiness guidance, and sync status.</p>
          </div>
          <div className="grid gap-3 rounded-3xl bg-slate-900/80 p-5 text-slate-300 shadow-lg shadow-black/20">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Last synced</p>
              <p className="mt-1 text-lg font-semibold text-white">{summary.lastSynced}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Readiness</p>
              <p className="mt-1 text-lg font-semibold text-white">{readiness}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-5">
          <Card title="Command Center" accent={summary.status}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Item label="Energy" value={formatCount(summary.energy)} />
              <Item label="Nerve" value={formatCount(summary.nerve)} />
              <Item label="Happy" value={formatCount(summary.happy)} />
              <Item label="Life" value={formatCount(summary.life)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Item label="Drug cooldown" value={summary.drugCooldown ?? "—"} />
              <Item label="Booster cooldown" value={summary.boosterCooldown ?? "—"} />
              <Item label="Medical cooldown" value={summary.medicalCooldown ?? "—"} />
            </div>
          </Card>

          <Card title="Training & Happy Jump Planner" accent={summary.happy !== undefined ? `${summary.happy}% happy` : undefined}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Item label="Strength" value={formatCount(summary.stats?.strength)} />
              <Item label="Defense" value={formatCount(summary.stats?.defense)} />
              <Item label="Speed" value={formatCount(summary.stats?.speed)} />
              <Item label="Dexterity" value={formatCount(summary.stats?.dexterity)} />
            </div>
            <div className="rounded-3xl bg-white/5 p-4 text-slate-200">
              <p className="font-semibold text-white">Focus</p>
              <p className="mt-2 text-sm text-slate-300">{summary.happy !== undefined && summary.happy > 80 ? "Ready for happy jump" : "Monitor happy items and cooldowns."}</p>
            </div>
          </Card>

          <Card title="Consumables Watchlist">
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(summary.inventory).slice(0, 6).map(([name, count]) => (
                <div key={name} className="rounded-3xl bg-white/5 px-4 py-3">
                  <p className="text-sm text-slate-400">{name}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{count}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Ron’s Priorities Today" accent={priorities.length > 0 ? "Top priorities" : "Stable"}>
            <ul className="space-y-3 text-slate-300">
              {priorities.map((message) => (
                <li key={message} className="rounded-3xl bg-white/5 px-4 py-3">
                  {message}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-3 text-slate-300">
              <StatRow label="Name" value={summary.name} />
              <StatRow label="Level" value={formatCount(summary.level)} />
              <StatRow label="Rank" value={summary.rank} />
              <StatRow label="Net worth" value={`$${summary.networth.toLocaleString()}`} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/5 px-4 py-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white/5 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
