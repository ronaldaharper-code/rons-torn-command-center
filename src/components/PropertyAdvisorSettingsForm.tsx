"use client";

import { useState } from "react";
import type { ManualRentalReminder } from "@/lib/settings";

interface PropertyAdvisorSettingsFormProps {
  initialExtensionReminderDays: number;
  initialUrgentReminderDays: number;
  initialManualReminders: ManualRentalReminder[];
}

export function PropertyAdvisorSettingsForm({
  initialExtensionReminderDays,
  initialUrgentReminderDays,
  initialManualReminders,
}: PropertyAdvisorSettingsFormProps) {
  const [extensionDays, setExtensionDays] = useState(initialExtensionReminderDays);
  const [urgentDays, setUrgentDays] = useState(initialUrgentReminderDays);
  const [reminders, setReminders] = useState(initialManualReminders);
  const [propertyLabel, setPropertyLabel] = useState("");
  const [rentalEndDate, setRentalEndDate] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(body: Record<string, unknown>, successMessage: string) {
    setStatus(null);
    setError(null);
    setSaving(true);

    const response = await fetch("/api/settings/property-advisor", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!response.ok) {
      const responseBody = await response.json().catch(() => null);
      setError(responseBody?.message ?? "Unable to save these settings.");
      return null;
    }

    setStatus(successMessage);
    return true;
  }

  function handleThresholdSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(extensionDays) || extensionDays <= 0 || !Number.isFinite(urgentDays) || urgentDays <= 0) {
      setError("Enter positive numbers of days for both thresholds.");
      return;
    }
    void save(
      { rentalExtensionReminderDays: String(Math.round(extensionDays)), urgentRentalReminderDays: String(Math.round(urgentDays)) },
      "Reminder thresholds saved.",
    );
  }

  async function handleAddReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!propertyLabel.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(rentalEndDate)) {
      setError("Enter a property label and a rental end date (YYYY-MM-DD).");
      return;
    }

    const ok = await save(
      { addManualReminder: { propertyLabel: propertyLabel.trim(), rentalEndDate, note: note.trim() || undefined } },
      "Manual reminder added.",
    );
    if (ok) {
      setReminders((prev) => [...prev, { id: crypto.randomUUID(), propertyLabel: propertyLabel.trim(), rentalEndDate, note: note.trim() || undefined }]);
      setPropertyLabel("");
      setRentalEndDate("");
      setNote("");
    }
  }

  async function handleRemoveReminder(id: string) {
    const ok = await save({ removeManualReminderId: id }, "Manual reminder removed.");
    if (ok) {
      setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
      <h2 className="text-lg font-semibold text-white">Property &amp; rental settings</h2>
      <p className="mt-1 text-sm text-slate-400">
        These power the Property Advisor&rsquo;s rental-extension timing: when to recommend offering an extension,
        when to treat it as urgent, and manual reminders for rentals where Torn doesn&rsquo;t expose an end date.
        Live API data (when available) always takes priority over these manual entries.
      </p>

      <form onSubmit={handleThresholdSubmit} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm text-slate-300">
          Offer extension at (days remaining)
          <input
            type="number"
            min={1}
            value={extensionDays}
            onChange={(event) => setExtensionDays(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
          />
        </label>
        <label className="block text-sm text-slate-300">
          Treat as urgent under (days remaining)
          <input
            type="number"
            min={1}
            value={urgentDays}
            onChange={(event) => setUrgentDays(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
        >
          Save thresholds
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-slate-200">Manual rental reminders</h3>
        <p className="mt-1 text-sm text-slate-400">
          Add one when a rental&rsquo;s end date isn&rsquo;t available from the API — we compute days remaining from
          the date you enter, the same way every time, rather than guessing.
        </p>

        {reminders.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                <span>
                  <span className="font-medium text-white">{reminder.propertyLabel}</span> — ends {reminder.rentalEndDate}
                  {reminder.note ? ` · ${reminder.note}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void handleRemoveReminder(reminder.id)}
                  disabled={saving}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No manual reminders set.</p>
        )}

        <form onSubmit={handleAddReminder} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
          <label className="block text-sm text-slate-300">
            Property label
            <input
              type="text"
              value={propertyLabel}
              onChange={(event) => setPropertyLabel(event.target.value)}
              placeholder="e.g. Beach House (off-platform deal)"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Rental end date
            <input
              type="date"
              value={rentalEndDate}
              onChange={(event) => setRentalEndDate(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Note (optional)
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Confirm with renter directly"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            Add reminder
          </button>
        </form>
      </div>

      {status ? <p className="mt-4 text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}
