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
// of the key's access level. Rather than maintain a brittle map of which
// selections may be combined, we fetch each selection in its own request
// (cached + parallelized) and merge the results. This also gives us clean
// per-selection access reporting for the UI (see TORN_API_FIELD_MAP.md).
//
// Selection names below reflect the *current* Torn API, not the legacy v1
// names this app originally guessed at — `stats`/`weapons`/`armor` were
// renamed to `battlestats`/`equipment`, and `chain` is a faction-level
// selection (not exposed via `/user/` to a personal key, regardless of
// access level). `enlistedcars` is fetched separately via the v2 API — the
// v1 `/user/` endpoint returns "code 23: only available in API v2" for it.
const PUBLIC_SELECTIONS_LIST = ["basic", "profile", "battlestats", "travel", "networth"];
const ADMIN_SELECTIONS_LIST = [
  ...PUBLIC_SELECTIONS_LIST,
  "money",
  "merits",
  "inventory",
  "properties",
  "equipment",
  "crimes",
  "cooldowns",
];

const SELECTION_LABELS: Record<string, string> = {
  basic: "Basic profile",
  profile: "Profile & vitals",
  battlestats: "Battle stats",
  money: "Points & money",
  merits: "Merits",
  travel: "Travel status",
  networth: "Net worth",
  inventory: "Inventory",
  properties: "Properties",
  equipment: "Weapons & armor",
  crimes: "Criminal record",
  enlistedcars: "Garage / racing",
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

// Most `/user/` selections nest their data under a key matching the selection
// name (`travel` -> `{ travel: {...} }`, `cooldowns` -> `{ cooldowns: {...} }`,
// etc). These three are the exception — Torn merges their fields directly
// into the top level of the response with no wrapper key. We re-wrap them
// here so `TornUserData.basic` / `.profile` / `.battlestats` are always
// populated consistently, regardless of which shape the API used.
const FLAT_SELECTIONS = new Set(["basic", "profile", "battlestats", "money"]);

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

  const data = FLAT_SELECTIONS.has(selection) ? { [selection]: json } : json;
  return { data, access: { selection, label: selectionLabel(selection), status: "ok" } };
}

// `enlistedcars` returns "code 23: This selection is only available in API v2"
// from the legacy `/user/?selections=` endpoint — it has to be fetched from
// the v2 API, which uses a different URL shape and response envelope
// (`{ enlistedcars: [...] }` with no `error` wrapper on the v1 shape).
async function fetchEnlistedCarsV2(): Promise<SelectionFetchResult> {
  if (!TORN_API_KEY) {
    throw new Error("Missing TORN_API_KEY in environment.");
  }

  const url = `${TORN_API_BASE}/v2/user/enlistedcars?key=${encodeURIComponent(TORN_API_KEY)}`;
  const response = await fetch(url, {
    next: { revalidate: 90 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Torn API Error] Status: ${response.status}, Body: ${text}`);
    return {
      data: {},
      access: { selection: "enlistedcars", label: selectionLabel("enlistedcars"), status: "error", message: `Request failed (${response.status})` },
    };
  }

  const json = (await response.json()) as Record<string, unknown> & { error?: { code: number; error: string } };

  if (json.error) {
    console.warn('[Torn API] Selection "enlistedcars" (v2) unavailable:', json.error);
    return {
      data: {},
      access: {
        selection: "enlistedcars",
        label: selectionLabel("enlistedcars"),
        status: statusForErrorCode(json.error.code),
        message: json.error.error,
      },
    };
  }

  return { data: json, access: { selection: "enlistedcars", label: selectionLabel("enlistedcars"), status: "ok" } };
}

async function fetchTornMerged(selections: string[], includeEnlistedCars: boolean): Promise<TornDataResult> {
  const fetches: Promise<SelectionFetchResult>[] = selections.map(fetchTornSelection);
  if (includeEnlistedCars) fetches.push(fetchEnlistedCarsV2());

  const results = await Promise.all(fetches);
  const data = Object.assign({}, ...results.map((result) => result.data)) as TornUserData;
  return { data, access: results.map((result) => result.access) };
}

export async function getTornUserData(): Promise<TornDataResult> {
  return cached<TornDataResult>("torn:user:data", 120, () => fetchTornMerged(ADMIN_SELECTIONS_LIST, true));
}

export async function getTornPublicData(): Promise<TornDataResult> {
  return cached<TornDataResult>("torn:user:public", 90, () => fetchTornMerged(PUBLIC_SELECTIONS_LIST, false));
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

function sumMerits(merits?: TornUserData["merits"]): number {
  if (!merits) return 0;
  return Object.values(merits).reduce((total, value) => total + (Number(value) || 0), 0);
}

export function mapCharacterOverview(data: TornUserData): CharacterOverview {
  const profile = data.profile as any || {};
  return {
    name: data.basic?.name ?? "Unknown",
    playerID: data.basic?.player_id ?? 0,
    level: data.basic?.level ?? 0,
    rank: data.profile?.rank ?? "Unknown",
    life: extractStat(profile, "life"),
    energy: extractStat(profile, "energy"),
    nerve: extractStat(profile, "nerve"),
    happy: extractStat(profile, "happy"),
    status: parseStatus(data),
    battleStatsTotal: data.battlestats?.total,
    points: data.money?.points ?? 0,
    merits: sumMerits(data.merits),
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
    rank: data.profile?.rank ?? "Unknown",
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
    equipment: data.equipment,
    enlistedcars: data.enlistedcars,
    criminalRecord: data.criminalrecord,
    cooldowns: data.cooldowns,
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
