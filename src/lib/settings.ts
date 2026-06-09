import { prisma } from "./db";
import { DEFAULT_OWNER_KEY } from "./owner";
import { DEFAULT_LOCAL_TIME_ZONE } from "./time";

// Generic per-owner key/value settings, backed by the existing `Setting`
// model (`{ ownerKey, key, value }`, unique on `[ownerKey, key]`). War
// Readiness is the first feature to use it — the model was already in the
// schema but unused, so no migration is needed.

const SETTING_KEYS = {
  preferredTimeZone: "preferredTimeZone",
  manualRankedWarStart: "manualRankedWarStartTime",
  vicodinCooldownAssumptionMinutes: "vicodinCooldownAssumptionMinutes",
} as const;

export type WarReadinessSettingKey = keyof typeof SETTING_KEYS;

const PROPERTY_SETTING_KEYS = {
  rentalExtensionReminderDays: "rentalExtensionReminderDays",
  urgentRentalReminderDays: "urgentRentalReminderDays",
  manualRentalReminders: "manualRentalReminders",
} as const;

// Shenzy's stated preference: offer a rental extension once the renter has
// 10 days left, and treat anything under 5 days as urgent. These are
// defaults, not hardcoded — adjustable in Settings per-owner.
export const DEFAULT_RENTAL_EXTENSION_REMINDER_DAYS = 10;
export const DEFAULT_URGENT_RENTAL_REMINDER_DAYS = 5;

export interface ManualRentalReminder {
  id: string;
  propertyLabel: string;
  /** ISO date (YYYY-MM-DD) the rental is expected to end. */
  rentalEndDate: string;
  note?: string;
}

export interface PropertyAdvisorSettings {
  rentalExtensionReminderDays: number;
  urgentRentalReminderDays: number;
  manualRentalReminders: ManualRentalReminder[];
}

// Torn doesn't expose how long Vicodin keeps the medical cooldown busy, so we
// fall back to a configurable, clearly-labeled assumption. 6 hours is a
// conservative (i.e. cautious-leaning-long) starting point — better to assume
// it ties up your cooldown longer than to promise a window that doesn't
// materialize. Adjust in Settings as you learn your own timing.
export const DEFAULT_VICODIN_COOLDOWN_ASSUMPTION_MINUTES = 360;

export interface WarReadinessSettings {
  preferredTimeZone: string;
  /** ISO 8601 timestamp, or undefined when not set. */
  manualRankedWarStart?: string;
  vicodinCooldownAssumptionMinutes: number;
}

async function readSetting(key: string): Promise<string | undefined> {
  const row = await prisma.setting.findUnique({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
  });
  return row?.value;
}

export async function getWarReadinessSettings(): Promise<WarReadinessSettings> {
  const [timeZone, manualStart, vicodinMinutes] = await Promise.all([
    readSetting(SETTING_KEYS.preferredTimeZone),
    readSetting(SETTING_KEYS.manualRankedWarStart),
    readSetting(SETTING_KEYS.vicodinCooldownAssumptionMinutes),
  ]);

  const parsedMinutes = vicodinMinutes !== undefined ? Number(vicodinMinutes) : NaN;

  return {
    preferredTimeZone: timeZone?.trim() || DEFAULT_LOCAL_TIME_ZONE,
    manualRankedWarStart: manualStart?.trim() || undefined,
    vicodinCooldownAssumptionMinutes:
      Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : DEFAULT_VICODIN_COOLDOWN_ASSUMPTION_MINUTES,
  };
}

// Pass `null` to clear a setting back to its default.
export async function setWarReadinessSetting(settingKey: WarReadinessSettingKey, value: string | null): Promise<void> {
  const key = SETTING_KEYS[settingKey];

  if (value === null || value.trim() === "") {
    await prisma.setting.deleteMany({ where: { ownerKey: DEFAULT_OWNER_KEY, key } });
    return;
  }

  await prisma.setting.upsert({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
    update: { value },
    create: { ownerKey: DEFAULT_OWNER_KEY, key, value },
  });
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function parseManualRentalReminders(raw: string | undefined): ManualRentalReminder[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is ManualRentalReminder =>
        entry &&
        typeof entry === "object" &&
        typeof entry.id === "string" &&
        typeof entry.propertyLabel === "string" &&
        typeof entry.rentalEndDate === "string",
    );
  } catch {
    return [];
  }
}

// The live API already exposes exact rental days-remaining for Shenzy's
// rented properties (`rental_period_remaining`), so manual reminders are a
// fallback for cases the API doesn't cover — e.g. an off-platform agreement,
// or a future property whose rental detail isn't returned. Stored as a JSON
// blob in the generic `Setting` table (per-owner) — no schema migration
// needed, mirroring how `manualRankedWarStart` already uses this table for
// a single value.
export async function getPropertyAdvisorSettings(): Promise<PropertyAdvisorSettings> {
  const [extensionDays, urgentDays, manualRemindersRaw] = await Promise.all([
    readSetting(PROPERTY_SETTING_KEYS.rentalExtensionReminderDays),
    readSetting(PROPERTY_SETTING_KEYS.urgentRentalReminderDays),
    readSetting(PROPERTY_SETTING_KEYS.manualRentalReminders),
  ]);

  return {
    rentalExtensionReminderDays: parsePositiveInt(extensionDays, DEFAULT_RENTAL_EXTENSION_REMINDER_DAYS),
    urgentRentalReminderDays: parsePositiveInt(urgentDays, DEFAULT_URGENT_RENTAL_REMINDER_DAYS),
    manualRentalReminders: parseManualRentalReminders(manualRemindersRaw),
  };
}

export async function setRentalReminderThreshold(
  settingKey: "rentalExtensionReminderDays" | "urgentRentalReminderDays",
  value: string | null,
): Promise<void> {
  const key = PROPERTY_SETTING_KEYS[settingKey];

  if (value === null || value.trim() === "") {
    await prisma.setting.deleteMany({ where: { ownerKey: DEFAULT_OWNER_KEY, key } });
    return;
  }

  await prisma.setting.upsert({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
    update: { value },
    create: { ownerKey: DEFAULT_OWNER_KEY, key, value },
  });
}

// ─── Jump Planner settings ────────────────────────────────────────────────

const JUMP_SETTING_KEYS = {
  trainingFocusStats: "jumpTrainingFocusStats",
  edcBenefitAvailable: "jumpEdcBenefitAvailable",
} as const;

export type JumpStatKey = "strength" | "defense" | "speed" | "dexterity";

export const DEFAULT_TRAINING_FOCUS_STATS: JumpStatKey[] = ["speed", "dexterity"];
export const EDC_HAPPY_BOOST = 3000;

export interface JumpPlannerSettings {
  trainingFocusStats: JumpStatKey[];
  edcBenefitAvailable: boolean;
}

const VALID_JUMP_STATS: JumpStatKey[] = ["strength", "defense", "speed", "dexterity"];

function parseTrainingFocusStats(raw: string | undefined): JumpStatKey[] {
  if (!raw) return DEFAULT_TRAINING_FOCUS_STATS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TRAINING_FOCUS_STATS;
    const filtered = parsed.filter((s): s is JumpStatKey => VALID_JUMP_STATS.includes(s as JumpStatKey));
    return filtered.length > 0 ? filtered : DEFAULT_TRAINING_FOCUS_STATS;
  } catch {
    return DEFAULT_TRAINING_FOCUS_STATS;
  }
}

export async function getJumpPlannerSettings(): Promise<JumpPlannerSettings> {
  const [focusRaw, edcRaw] = await Promise.all([
    readSetting(JUMP_SETTING_KEYS.trainingFocusStats),
    readSetting(JUMP_SETTING_KEYS.edcBenefitAvailable),
  ]);
  return {
    trainingFocusStats: parseTrainingFocusStats(focusRaw),
    edcBenefitAvailable: edcRaw === "false" ? false : true,
  };
}

export async function setJumpTrainingFocus(stats: JumpStatKey[]): Promise<void> {
  const key = JUMP_SETTING_KEYS.trainingFocusStats;
  const value = JSON.stringify(stats.filter((s): s is JumpStatKey => VALID_JUMP_STATS.includes(s)));
  await prisma.setting.upsert({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
    update: { value },
    create: { ownerKey: DEFAULT_OWNER_KEY, key, value },
  });
}

export async function setEdcBenefitAvailable(available: boolean): Promise<void> {
  const key = JUMP_SETTING_KEYS.edcBenefitAvailable;
  await prisma.setting.upsert({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
    update: { value: String(available) },
    create: { ownerKey: DEFAULT_OWNER_KEY, key, value: String(available) },
  });
}

// ─── Property advisor settings (continued) ───────────────────────────────

export async function setManualRentalReminders(reminders: ManualRentalReminder[]): Promise<void> {
  const key = PROPERTY_SETTING_KEYS.manualRentalReminders;

  if (reminders.length === 0) {
    await prisma.setting.deleteMany({ where: { ownerKey: DEFAULT_OWNER_KEY, key } });
    return;
  }

  const value = JSON.stringify(reminders);
  await prisma.setting.upsert({
    where: { ownerKey_key: { ownerKey: DEFAULT_OWNER_KEY, key } },
    update: { value },
    create: { ownerKey: DEFAULT_OWNER_KEY, key, value },
  });
}
