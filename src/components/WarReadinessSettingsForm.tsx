"use client";

import { useState } from "react";
import { isValidTimeZone } from "@/lib/time";

interface WarReadinessSettingsFormProps {
  initialPreferredTimeZone: string;
  initialManualRankedWarStart?: string;
  initialVicodinCooldownAssumptionMinutes: number;
}

const SUGGESTED_TIME_ZONES = [
  "America/Detroit",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function WarReadinessSettingsForm({
  initialPreferredTimeZone,
  initialManualRankedWarStart,
  initialVicodinCooldownAssumptionMinutes,
}: WarReadinessSettingsFormProps) {
  const [timeZone, setTimeZone] = useState(initialPreferredTimeZone);
  const [warStartLocal, setWarStartLocal] = useState(() => toDatetimeLocalValue(initialManualRankedWarStart));
  const [vicodinMinutes, setVicodinMinutes] = useState(initialVicodinCooldownAssumptionMinutes);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(changes: Record<string, string | null>, successMessage: string) {
    setStatus(null);
    setError(null);
    setSaving(true);

    const response = await fetch("/api/settings/war-readiness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Unable to save these settings.");
      return;
    }

    setStatus(successMessage);
  }

  function handleTimeZoneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = timeZone.trim();
    if (!isValidTimeZone(trimmed)) {
      setError(`"${trimmed}" doesn't look like a valid IANA time zone (e.g. America/Detroit).`);
      return;
    }
    void save({ preferredTimeZone: trimmed }, "Time zone saved.");
  }

  function handleWarStartSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!warStartLocal) {
      void save({ manualRankedWarStart: null }, "Manual ranked war start time cleared.");
      return;
    }
    const date = new Date(warStartLocal);
    if (Number.isNaN(date.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }
    void save({ manualRankedWarStart: date.toISOString() }, "Ranked war start time saved.");
  }

  function handleVicodinSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(vicodinMinutes) || vicodinMinutes <= 0) {
      setError("Enter a positive number of minutes.");
      return;
    }
    void save({ vicodinCooldownAssumptionMinutes: String(Math.round(vicodinMinutes)) }, "Vicodin cooldown assumption saved.");
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <h2 className="text-lg font-semibold text-white">War readiness settings</h2>
      <p className="mt-1 text-sm text-slate-400">
        These power the War Readiness Countdown: which time zone to show alongside Torn City Time, when ranked war starts
        (only used when Torn isn&rsquo;t reporting a scheduled war), and how long you assume Vicodin keeps your medical
        cooldown busy (the API doesn&rsquo;t expose this directly, so it&rsquo;s a configurable, conservative estimate).
      </p>

      <form onSubmit={handleTimeZoneSubmit} className="mt-6 grid gap-3 sm:grid-cols-[2fr_auto] sm:items-end">
        <label className="block text-sm text-slate-300">
          Preferred time zone (IANA name)
          <input
            type="text"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            placeholder="America/Detroit"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          Save zone
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_TIME_ZONES.map((zone) => (
          <button
            key={zone}
            type="button"
            onClick={() => setTimeZone(zone)}
            className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-300"
          >
            {zone}
          </button>
        ))}
      </div>

      <form onSubmit={handleWarStartSubmit} className="mt-8 grid gap-3 sm:grid-cols-[2fr_auto] sm:items-end">
        <label className="block text-sm text-slate-300">
          Manual ranked war start (used only when Torn reports none) — enter in your preferred local time above
          <input
            type="datetime-local"
            value={warStartLocal}
            onChange={(event) => setWarStartLocal(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {warStartLocal ? "Save time" : "Clear time"}
        </button>
      </form>

      <form onSubmit={handleVicodinSubmit} className="mt-8 grid gap-3 sm:grid-cols-[2fr_auto] sm:items-end">
        <label className="block text-sm text-slate-300">
          Vicodin cooldown assumption (minutes)
          <input
            type="number"
            min={1}
            value={vicodinMinutes}
            onChange={(event) => setVicodinMinutes(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          Save assumption
        </button>
      </form>

      {status ? <p className="mt-4 text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
