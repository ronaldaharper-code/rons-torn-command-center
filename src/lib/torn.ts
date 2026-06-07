import { cached } from "./cache";
import type { AdminSummary, PublicSummary, TornUserData, TornCharacterStatus, CharacterOverview, FinancialSnapshot } from "./torn-types";

const TORN_API_BASE = "https://api.torn.com";
const TORN_API_KEY = process.env.TORN_API_KEY;
const PUBLIC_SELECTIONS = [
  "basic",
  "profile",
  "stats",
  "travel",
  "networth",
].join(",");
const ADMIN_SELECTIONS = [
  "basic",
  "profile",
  "stats",
  "travel",
  "networth",
  "inventory",
  "items",
  "properties",
  "weapons",
  "armor",
  "garage",
  "crimes",
  "chain",
].join(",");

function parseStatus(data: TornUserData): TornCharacterStatus {
  if (data.travel?.jail) return "jail";
  if (data.travel?.hospital) return "hospital";
  if (data.travel?.traveling) return "traveling";
  return "okay";
}

function formatTimestamp(value?: number | string): string {
  if (!value) return "Unknown";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchTorn<T>(selections: string): Promise<T> {
  if (!TORN_API_KEY) {
    throw new Error("Missing TORN_API_KEY in environment.");
  }

  const url = `${TORN_API_BASE}/user/?selections=${encodeURIComponent(selections)}&key=${encodeURIComponent(
    TORN_API_KEY,
  )}`;

  const response = await fetch(url, {
    next: { revalidate: 90 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Torn API request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as T;
  return json;
}

export async function getTornUserData(): Promise<TornUserData> {
  return cached<TornUserData>("torn:user:data", 120, () => fetchTorn<TornUserData>(ADMIN_SELECTIONS));
}

export async function getTornPublicData(): Promise<TornUserData> {
  return cached<TornUserData>("torn:user:public", 90, () => fetchTorn<TornUserData>(PUBLIC_SELECTIONS));
}

function buildInventoryMap(inventory?: TornUserData["inventory"], items?: TornUserData["items"]): Record<string, number> {
  const counts: Record<string, number> = {};
  if (inventory?.items) {
    for (const [name, details] of Object.entries(inventory.items)) {
      counts[name] = Number(details?.quantity ?? 0);
    }
  }
  if (items) {
    for (const [name, details] of Object.entries(items)) {
      if (typeof details === "object" && details !== null && "quantity" in details) {
        counts[name] = Math.max(counts[name] || 0, Number((details as any).quantity ?? 0));
      }
    }
  }
  return counts;
}

function extractStat(profile: any, key: string): { current: number; maximum: number } {
  const value = profile?.[key];
  if (typeof value === "object" && value !== null && "current" in value) {
    return { current: value.current || 0, maximum: value.maximum || 0 };
  }
  return { current: 0, maximum: 0 };
}

export function mapCharacterOverview(data: TornUserData): CharacterOverview {
  const profile = data.profile as any || {};
  return {
    name: data.basic?.name ?? "Unknown",
    playerID: data.basic?.player_id ?? 0,
    level: data.basic?.level ?? 0,
    rank: data.basic?.rank ?? "Unknown",
    life: extractStat(profile, "life"),
    energy: extractStat(profile, "energy"),
    nerve: extractStat(profile, "nerve"),
    happy: extractStat(profile, "happy"),
    status: parseStatus(data),
    chain: {
      current: (data.chain as any)?.current ?? 0,
      max: (data.chain as any)?.max ?? 0,
    },
    points: profile.points ?? 0,
    merits: profile.merits ?? 0,
  };
}

export function mapFinancialSnapshot(data: TornUserData): FinancialSnapshot {
  return {
    cash: data.networth?.cash ?? 0,
    bank: data.networth?.bank ?? 0,
    stock: data.networth?.stock ?? 0,
    properties: data.networth?.property ?? 0,
    items: data.networth?.items ?? 0,
    total: data.networth?.total ?? 0,
    lastUpdated: Date.now(),
  };
}

export function mapPublicSummary(data: TornUserData): PublicSummary {
  const status = parseStatus(data);
  return {
    name: data.basic?.name ?? "Unknown",
    level: data.basic?.level ?? 0,
    rank: data.basic?.rank ?? "Unknown",
    status,
    networth: data.networth?.total ?? 0,
    cash: data.networth?.cash ?? 0,
    travelStatus: data.travel?.status ?? status,
    lastSynced: formatTimestamp(Date.now()),
  };
}

export function mapAdminSummary(data: TornUserData): AdminSummary {
  return {
    character: mapCharacterOverview(data),
    financial: mapFinancialSnapshot(data),
    gear: (data as any).gear,
    garage: data.garage,
    crimes: data.crimes,
    chain: (data.chain as any),
    cooldowns: (data as any).cooldowns,
    lastSynced: formatTimestamp(Date.now()),
  };
}

export function getPriorityMessages(summary: AdminSummary) {
  const messages: string[] = [];
  const charData = summary.character;
  if (charData.happy.current < 70) messages.push("Focus on happy items and jump preparation.");
  if (charData.energy.current < 50) messages.push("Consider using an energy item or training later.");
  if (summary.financial.cash < 2_000_000) messages.push("Cash is low for a $2B bank plan.");
  if (charData.status === "hospital") messages.push("Recover from hospital before training.");
  if (charData.status === "jail") messages.push("Wait for jail or rehab clearance.");
  if (!messages.length) messages.push("Overall status looks stable. Maintain your current plan.");
  return messages;
}
