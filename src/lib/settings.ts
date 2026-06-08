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
