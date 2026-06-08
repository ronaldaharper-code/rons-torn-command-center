"use client";

import { useState } from "react";
import type { WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

interface SettingsFormProps {
  initialItems: WatchedItem[];
}

const CATEGORY_OPTIONS: { value: WatchedItemCategory; label: string }[] = [
  { value: "consumable", label: "Consumable" },
  { value: "energy", label: "Energy" },
  { value: "happy", label: "Happy" },
  { value: "medical", label: "Medical" },
  { value: "other", label: "Other" },
];

const SUGGESTED_ITEMS: { itemName: string; category: WatchedItemCategory; minTarget: number }[] = [
  { itemName: "Xanax", category: "energy", minTarget: 10 },
  { itemName: "Vicodin", category: "medical", minTarget: 10 },
  { itemName: "Ecstasy", category: "happy", minTarget: 12 },
  { itemName: "Empty Blood Bag", category: "medical", minTarget: 3 },
  { itemName: "Filled Blood Bag", category: "medical", minTarget: 3 },
  { itemName: "Candy", category: "happy", minTarget: 6 },
];

function categoryLabel(category: WatchedItemCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? "Other";
}

export function SettingsForm({ initialItems }: SettingsFormProps) {
  const [items, setItems] = useState<WatchedItem[]>(initialItems);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState<WatchedItemCategory>("consumable");
  const [customTarget, setCustomTarget] = useState(5);

  const watchedNames = new Set(items.map((item) => item.itemName.toLowerCase()));
  const suggestions = SUGGESTED_ITEMS.filter((suggestion) => !watchedNames.has(suggestion.itemName.toLowerCase()));

  async function addItem(payload: { itemName: string; category: WatchedItemCategory; minTarget: number; alertEnabled?: boolean }) {
    setStatus(null);
    setError(null);

    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, alertEnabled: payload.alertEnabled ?? true }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Unable to add item to the watchlist.");
      return;
    }

    const { item } = await response.json();
    setItems((current) => [...current, item].sort((a, b) => a.itemName.localeCompare(b.itemName)));
    setStatus(`${item.itemName} added to the watchlist.`);
  }

  async function updateItem(item: WatchedItem, changes: Partial<Pick<WatchedItem, "category" | "minTarget" | "alertEnabled">>) {
    setStatus(null);
    setError(null);
    setPendingId(item.id);

    const response = await fetch(`/api/watchlist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });

    setPendingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Unable to update this item.");
      return;
    }

    const { item: updated } = await response.json();
    setItems((current) => current.map((existing) => (existing.id === updated.id ? updated : existing)));
    setStatus(`${updated.itemName} updated.`);
  }

  async function removeItem(item: WatchedItem) {
    setStatus(null);
    setError(null);
    setPendingId(item.id);

    const response = await fetch(`/api/watchlist/${item.id}`, { method: "DELETE" });

    setPendingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.message ?? "Unable to remove this item.");
      return;
    }

    setItems((current) => current.filter((existing) => existing.id !== item.id));
    setStatus(`${item.itemName} removed from the watchlist.`);
  }

  function handleCustomSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const itemName = customName.trim();
    if (!itemName) return;

    void addItem({ itemName, category: customCategory, minTarget: customTarget });
    setCustomName("");
    setCustomCategory("consumable");
    setCustomTarget(5);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Watched items</h2>
        <p className="mt-1 text-sm text-slate-400">Set a minimum quantity for each item. You&rsquo;ll be flagged when your stock drops below this target.</p>

        {items.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            Your watchlist is empty. Add an item below to start tracking it.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{item.itemName}</p>
                    <p className="text-sm text-slate-400">{categoryLabel(item.category)}</p>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={item.alertEnabled}
                      disabled={pendingId === item.id}
                      onChange={(event) => updateItem(item, { alertEnabled: event.target.checked })}
                      className="h-4 w-4 rounded border-white/10 bg-slate-900 text-cyan-400 focus:ring-cyan-400"
                    />
                    Enable alert
                  </label>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <label className="block text-sm text-slate-300">
                    Category
                    <select
                      value={item.category}
                      disabled={pendingId === item.id}
                      onChange={(event) => updateItem(item, { category: event.target.value as WatchedItemCategory })}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    Minimum target
                    <input
                      type="number"
                      min={0}
                      value={item.minTarget}
                      disabled={pendingId === item.id}
                      onChange={(event) => updateItem(item, { minTarget: Number(event.target.value) })}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={pendingId === item.id}
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {suggestions.length > 0 ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-white">Suggested Torn consumables</h2>
          <p className="mt-1 text-sm text-slate-400">Quick-add common items Ron tracks for jumps, training, and recovery.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.itemName}
                type="button"
                onClick={() => addItem(suggestion)}
                className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-cyan-400/40 hover:text-cyan-300"
              >
                + {suggestion.itemName}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Add a custom item</h2>
        <form onSubmit={handleCustomSubmit} className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <label className="block text-sm text-slate-300">
            Item name
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="e.g. Refill"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Category
            <select
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value as WatchedItemCategory)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-300">
            Minimum target
            <input
              type="number"
              min={0}
              value={customTarget}
              onChange={(event) => setCustomTarget(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Add item
          </button>
        </form>
      </section>

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
