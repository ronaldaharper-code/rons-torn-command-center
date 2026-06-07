import type { PublicSummary } from "@/lib/torn-types";
import { Card } from "./ui/Card";

interface PublicDashboardProps {
  summary: PublicSummary;
}

export function PublicDashboard({ summary }: PublicDashboardProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/70">Ron’s Torn Command Center</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Public Torn Snapshot</h1>
          </div>
          <div className="rounded-3xl bg-slate-900/80 px-5 py-3 text-sm text-slate-300 shadow-lg shadow-black/20">
            Last synced: {summary.lastSynced}
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-slate-400">A polished public share page for friends and allies. This view highlights character progress, current status, and net worth without exposing your Torn API key or sensitive private details.</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Character Summary">
          <div className="space-y-3">
            <div className="flex justify-between text-slate-300">
              <span>Name</span>
              <span className="font-medium text-white">{summary.name}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Level</span>
              <span className="font-medium text-white">{summary.level}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Rank</span>
              <span className="font-medium text-white">{summary.rank}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Status</span>
              <span className="font-medium text-white">{summary.status}</span>
            </div>
          </div>
        </Card>

        <Card title="Battle & Racing Snapshot">
          <div className="space-y-3 text-slate-300">
            <p>Battle stats are shown when available in Torn API data.</p>
            <p>Racing and higher-level summaries can be added after API confirmation.</p>
          </div>
        </Card>

        <Card title="Net Worth">
          <div className="space-y-3">
            <div className="flex justify-between text-slate-300">
              <span>Total net worth</span>
              <span className="font-medium text-white">${summary.networth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cash</span>
              <span className="font-medium text-white">${summary.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Travel state</span>
              <span className="font-medium text-white">{summary.travelStatus}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
