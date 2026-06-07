"use client";

import { useState } from "react";

interface SettingItem {
  itemName: string;
  minTarget: number;
  alertEnabled: boolean;
}

interface SettingsFormProps {
  items: SettingItem[];
}

export function SettingsForm({ items }: SettingsFormProps) {
  const [formState, setFormState] = useState(items);
  const [status, setStatus] = useState<string | null>(null);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const body = formState.map((item) => ({
      itemName: item.itemName,
      minTarget: item.minTarget,
      alertEnabled: item.alertEnabled,
    }));

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setStatus("Settings saved.");
      return;
    }

    setStatus("Unable to save settings. Please try again.");
  }

  function updateItem(index: number, changes: Partial<SettingItem>) {
    const next = [...formState];
    next[index] = { ...next[index], ...changes };
    setFormState(next);
  }

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      {formState.map((item, index) => (
        <div key={item.itemName} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">{item.itemName}</p>
              <p className="text-sm text-slate-400">Watchlist threshold and alert settings.</p>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={item.alertEnabled}
                onChange={(event) => updateItem(index, { alertEnabled: event.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
              />
              Enable alert
            </label>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <label className="block text-sm text-slate-300">
              Minimum target
              <input
                type="number"
                min={0}
                value={item.minTarget}
                onChange={(event) => updateItem(index, { minTarget: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
        </div>
      ))}
      <button type="submit" className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
        Save watchlist settings
      </button>
      {status ? <p className="text-sm text-slate-300">{status}</p> : null}
    </form>
  );
}
