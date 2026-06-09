"use client";

import { useState } from "react";
import type { JumpStatKey } from "@/lib/settings";

interface Props {
  initialTrainingFocusStats: JumpStatKey[];
  initialEdcBenefitAvailable: boolean;
}

const ALL_STATS: { key: JumpStatKey; label: string }[] = [
  { key: "strength", label: "Strength" },
  { key: "defense", label: "Defense" },
  { key: "speed", label: "Speed" },
  { key: "dexterity", label: "Dexterity" },
];

export function JumpPlannerSettingsForm({ initialTrainingFocusStats, initialEdcBenefitAvailable }: Props) {
  const [focusStats, setFocusStats] = useState<JumpStatKey[]>(initialTrainingFocusStats);
  const [edcAvailable, setEdcAvailable] = useState(initialEdcBenefitAvailable);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(body: Record<string, unknown>, msg: string) {
    setStatus(null);
    setError(null);
    setSaving(true);
    const res = await fetch("/api/settings/jump-planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.message ?? "Unable to save.");
      return false;
    }
    setStatus(msg);
    return true;
  }

  function toggleStat(key: JumpStatKey) {
    setFocusStats((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  }

  async function handleFocusSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (focusStats.length === 0) {
      setError("Select at least one training stat.");
      return;
    }
    await save({ trainingFocusStats: focusStats }, "Training focus saved.");
  }

  async function handleEdcToggle(available: boolean) {
    const ok = await save({ edcBenefitAvailable: available }, available ? "EDC benefit marked available." : "EDC benefit marked as used.");
    if (ok) setEdcAvailable(available);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <h2 className="text-lg font-semibold text-white">Jump Planner settings</h2>
      <p className="mt-1 text-sm text-slate-400">
        Configure which stats to train this month and whether the EDC stock benefit is available.
      </p>

      {/* Training focus */}
      <form onSubmit={handleFocusSubmit} className="mt-6">
        <p className="mb-3 text-sm font-medium text-slate-200">Training focus — stats to train this month</p>
        <div className="flex flex-wrap gap-2">
          {ALL_STATS.map(({ key, label }) => {
            const selected = focusStats.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStat(key)}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                    : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={saving || focusStats.length === 0}
          className="mt-4 rounded-2xl bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          Save training focus
        </button>
      </form>

      {/* EDC benefit toggle */}
      <div className="mt-8">
        <p className="mb-1 text-sm font-medium text-slate-200">EDC stock benefit</p>
        <p className="mb-3 text-sm text-slate-400">
          EDC provides +3,000 happy. Mark it as used after you apply it — the planner will remind you when it&rsquo;s available.
        </p>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              edcAvailable
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : "border-slate-500/30 bg-slate-800 text-slate-400"
            }`}
          >
            {edcAvailable ? "Available" : "Used"}
          </span>
          {edcAvailable ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleEdcToggle(false)}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              Mark as used
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleEdcToggle(true)}
              className="rounded-2xl border border-emerald-500/20 px-4 py-2 text-sm text-emerald-300 transition hover:border-emerald-400/40 disabled:opacity-50"
            >
              Mark as available
            </button>
          )}
        </div>
      </div>

      {status && <p className="mt-4 text-sm text-emerald-300">{status}</p>}
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </section>
  );
}
