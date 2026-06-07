import { cached } from "./cache";
import type { AdminSummary, PublicSummary, TornUserData, TornCharacterStatus } from "./torn-types";

const TORN_API_BASE = "https://api.torn.com";
const TORN_API_KEY = process.env.TORN_API_KEY;
const PUBLIC_SELECTIONS = [
  "basic",
  "profile",
  "stats",
  "travel",
  "networth",
  "inventory",
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
  const publicSummary = mapPublicSummary(data);
  return {
    ...publicSummary,
    energy: Number((data.profile as any)?.energy ?? 0),
    nerve: Number((data.profile as any)?.nerve ?? 0),
    happy: Number((data.profile as any)?.happy ?? 0),
    life: Number((data.profile as any)?.life ?? 0),
    drugCooldown: (data.profile as any)?.drug_cooldown ?? "Unknown",
    boosterCooldown: (data.profile as any)?.booster_cooldown ?? "Unknown",
    medicalCooldown: (data.profile as any)?.medical_cooldown ?? "Unknown",
    inventory: buildInventoryMap(data.inventory, data.items),
    stats: data.stats,
  };
}

export function getPriorityMessages(summary: AdminSummary) {
  const messages: string[] = [];
  if (summary.happy !== undefined && summary.happy < 70) messages.push("Focus on happy items and jump preparation.");
  if (summary.energy !== undefined && summary.energy < 50) messages.push("Consider using an energy item or training later.");
  if (summary.cash < 2_000_000) messages.push("Cash is low for a $2B bank plan.");
  if (summary.status === "hospital") messages.push("Recover from hospital before training.");
  if (summary.status === "jail") messages.push("Wait for jail or rehab clearance.");
  if (!messages.length) messages.push("Overall status looks stable. Maintain your current plan.");
  return messages;
}
