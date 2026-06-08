import { cached } from "./cache";
import type {
  AdminSummary,
  PublicSummary,
  TornUserData,
  TornCharacterStatus,
  TornItemInventory,
  TornAccessEntry,
  TornAccessStatus,
  TornDataResult,
  CharacterOverview,
  FinancialSnapshot,
  CooldownEntry,
  CooldownState,
} from "./torn-types";

const TORN_API_BASE = "https://api.torn.com";
const TORN_API_KEY = process.env.TORN_API_KEY;

// IMPORTANT: the Torn `/user/` endpoint rejects certain selection
// *combinations* with a generic "Wrong fields" (code 4) error — independent
// of the key's access level. For example `stats` cannot be combined with
// `profile`/`travel`/`networth`, and `weapons`/`armor` conflict with
// `inventory`/`properties`/`networth`. Rather than maintain a brittle map of
// which selections may be combined, we fetch each selection in its own
// request (cached + parallelized) and merge the results. This also gives us
// clean per-selection access reporting for the UI (see TORN_API_FIELD_MAP.md).
const PUBLIC_SELECTIONS_LIST = ["basic", "profile", "stats", "travel", "networth"];
const ADMIN_SELECTIONS_LIST = [
  ...PUBLIC_SELECTIONS_LIST,
  "inventory",
  "properties",
  "weapons",
  "armor",
  "enlistedcars",
  "crimes",
  "chain",
  "cooldowns",
];

const SELECTION_LABELS: Record<string, string> = {
  basic: "Basic profile",
  profile: "Profile & vitals",
  stats: "Battle stats",
  travel: "Travel status",
  networth: "Net worth",
  inventory: "Inventory",
  properties: "Properties",
  weapons: "Weapons",
  armor: "Armor",
  enlistedcars: "Garage / racing",
  crimes: "Crimes",
  chain: "Faction chain",
  cooldowns: "Cooldowns",
};

function selectionLabel(selection: string): string {
  return SELECTION_LABELS[selection] ?? selection;
}

function statusForErrorCode(code: number): TornAccessStatus {
  if (code === 16 || code === 7) return "denied";
  if (code === 4) return "unavailable";
  return "error";
}

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

interface SelectionFetchResult {
  data: Record<string, unknown>;
  access: TornAccessEntry;
}

async function fetchTornSelection(selection: string): Promise<SelectionFetchResult> {
  if (!TORN_API_KEY) {
    throw new Error("Missing TORN_API_KEY in environment.");
  }

  const url = `${TORN_API_BASE}/user/?selections=${encodeURIComponent(selection)}&key=${encodeURIComponent(
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
    console.error(`[Torn API Error] Status: ${response.status}, Body: ${text}`);
    return {
      data: {},
      access: { selection, label: selectionLabel(selection), status: "error", message: `Request failed (${response.status})` },
    };
  }

  const json = (await response.json()) as Record<string, unknown> & { error?: { code: number; error: string } };

  if (json.error) {
    console.warn(`[Torn API] Selection "${selection}" unavailable:`, json.error);
    return {
      data: {},
      access: {
        selection,
        label: selectionLabel(selection),
        status: statusForErrorCode(json.error.code),
        message: json.error.error,
      },
    };
  }

  return { data: json, access: { selection, label: selectionLabel(selection), status: "ok" } };
}

async function fetchTornMerged(selections: string[]): Promise<TornDataResult> {
  const results = await Promise.all(selections.map(fetchTornSelection));
  const data = Object.assign({}, ...results.map((result) => result.data)) as TornUserData;
  // `enlistedcars` is the current API selection name for what this app models as `garage`.
  if ("enlistedcars" in data) {
    (data as Record<string, unknown>).garage = (data as Record<string, unknown>).enlistedcars;
  }
  return { data, access: results.map((result) => result.access) };
}

export async function getTornUserData(): Promise<TornDataResult> {
  return cached<TornDataResult>("torn:user:data", 120, () => fetchTornMerged(ADMIN_SELECTIONS_LIST));
}

export async function getTornPublicData(): Promise<TornDataResult> {
  return cached<TornDataResult>("torn:user:public", 90, () => fetchTornMerged(PUBLIC_SELECTIONS_LIST));
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

export function inventoryQuantity(inventory: TornItemInventory | undefined, itemName: string): number {
  const entry = Object.values(inventory?.items ?? {}).find(
    (item) => (item?.name ?? "").toLowerCase() === itemName.toLowerCase(),
  );
  return Number(entry?.quantity ?? 0);
}

function formatSecondsRemaining(seconds: number): string {
  if (seconds <= 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function cooldownStateFromSeconds(seconds: number): CooldownState {
  if (seconds <= 0) return "ready";
  return "waiting";
}

export function mapCooldownOverview(data: TornUserData): CooldownEntry[] {
  const cooldowns = data.cooldowns ?? {};
  const travel = data.travel;

  const entries: CooldownEntry[] = [
    {
      key: "drug",
      label: "Drug",
      state: cooldownStateFromSeconds(cooldowns.drug ?? 0),
      secondsRemaining: cooldowns.drug ?? 0,
      detail: (cooldowns.drug ?? 0) > 0 ? formatSecondsRemaining(cooldowns.drug ?? 0) : "Ready to use",
    },
    {
      key: "booster",
      label: "Booster",
      state: cooldownStateFromSeconds(cooldowns.booster ?? 0),
      secondsRemaining: cooldowns.booster ?? 0,
      detail: (cooldowns.booster ?? 0) > 0 ? formatSecondsRemaining(cooldowns.booster ?? 0) : "Ready to use",
    },
    {
      key: "medical",
      label: "Medical",
      state: cooldownStateFromSeconds(cooldowns.medical ?? 0),
      secondsRemaining: cooldowns.medical ?? 0,
      detail: (cooldowns.medical ?? 0) > 0 ? formatSecondsRemaining(cooldowns.medical ?? 0) : "Ready to use",
    },
  ];

  // Crime and mission cooldowns aren't part of the `cooldowns` selection Torn
  // exposes today — surface them as "unavailable" rather than guessing at a
  // ready/waiting state from data we don't actually have.
  entries.push(
    {
      key: "crime",
      label: "Crime",
      state: "unavailable",
      detail: "Crime cooldown data isn't available from the API yet",
    },
    {
      key: "mission",
      label: "Mission",
      state: "unavailable",
      detail: "Mission cooldown data isn't available from the API yet",
    },
  );

  if (travel?.traveling) {
    entries.push({
      key: "travel",
      label: "Travel",
      state: "waiting",
      detail: travel.destination ? `Traveling to ${travel.destination}` : "Currently traveling",
    });
  } else if (travel?.jail) {
    entries.push({ key: "travel", label: "Travel", state: "unavailable", detail: "Currently in jail" });
  } else if (travel?.hospital) {
    entries.push({ key: "travel", label: "Travel", state: "unavailable", detail: "Currently in hospital" });
  } else {
    entries.push({ key: "travel", label: "Travel", state: "ready", detail: "Available to travel" });
  }

  return entries;
}
