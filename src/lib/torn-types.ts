export type TornCharacterStatus = "okay" | "hospital" | "jail" | "traveling" | "unknown";

export interface TornBasic {
  name?: string;
  level?: number;
  faction?: string;
  gender?: string;
  player_id?: number;
  userID?: number;
  image?: string;
}

// `states` carries hospital/jail *release* timestamps (unix seconds, 0 when
// not applicable) — the only place the API exposes exact release times. We
// surface these so War Readiness can forecast "will this clear before war
// starts?" instead of guessing.
export interface TornProfileStates {
  hospital_timestamp?: number;
  jail_timestamp?: number;
}

export interface TornProfileFaction {
  faction_id?: number;
  faction_name?: string;
}

export interface TornProfile {
  status?: string;
  rank?: string;
  rankposition?: number;
  life?: { current?: number; maximum?: number };
  faction?: TornProfileFaction;
  states?: TornProfileStates;
}

export interface TornVitalBar {
  current?: number;
  maximum?: number;
}

// `energy`/`nerve`/`happy` live in the `bars` selection, not `profile` —
// `profile` only carries `life`. `bars` returns all of them flat at the top
// level (energy, nerve, happy, life, chain, server_time) with no wrapper key.
export interface TornBars {
  energy?: TornVitalBar;
  nerve?: TornVitalBar;
  happy?: TornVitalBar;
  life?: TornVitalBar;
  chain?: { current?: number; maximum?: number; timeout?: number; modifier?: number; cooldown?: number };
}

export interface TornMoney {
  points?: number;
  money_onhand?: number;
  cayman_bank?: number;
  vault_amount?: number;
}

// The `merits` selection returns a flat map of merit category -> allocated
// points (e.g. `{ "Nerve Bar": 10, "Critical Hit Rate": 0, ... }`), not a
// single total — we sum the values for a "total merits invested" figure.
export type TornMerits = Record<string, number>;

export interface TornBattleStats {
  strength?: number;
  defense?: number;
  speed?: number;
  dexterity?: number;
  total?: number;
}

export interface TornTravel {
  status?: string;
  traveling?: boolean;
  jail?: boolean;
  hospital?: boolean;
  destination?: string;
}

export interface TornNetworth {
  total?: number;
  cash?: number;
  bank?: number;
  stock?: number;
  items?: number;
  property?: number;
  points?: number;
}

export interface TornItemInventory {
  total_items?: number;
  items?: Record<string, { quantity?: number; name?: string }>;
}

export interface TornCooldowns {
  drug?: number;
  medical?: number;
  booster?: number;
}

export interface TornEquipmentItem {
  ID?: number;
  UID?: number;
  name?: string;
  type?: string;
  equipped?: number;
  market_price?: number;
  quantity?: number;
}

export interface TornEquipmentBonus {
  id?: number;
  title?: string;
  description?: string;
  value?: number;
}

export interface TornEquipmentStats {
  damage?: number | null;
  accuracy?: number | null;
  armor?: number | null;
  quality?: number | null;
}

// Richer per-item detail from `v2/user/equipment` — joined with the
// `selections=equipment` list (above) by `uid`/`UID`. The v1 list provides
// the canonical slot category (`type`: "Primary"/"Secondary"/"Melee"/
// "Defensive"/"Temporary"/"Enhancer"/"Clothing") while this v2 detail adds
// stats, named bonuses, and rarity that the v1 shape doesn't expose.
export interface TornEquipmentDetail {
  id?: number;
  name?: string;
  uid?: number;
  type?: string;
  sub_type?: string | null;
  stats?: TornEquipmentStats | null;
  bonuses?: TornEquipmentBonus[];
  rarity?: string | null;
  slot?: number;
}

export interface EquipmentDetails {
  items?: TornEquipmentDetail[];
}

export interface TornEnlistedCar {
  id?: number;
  car_item_id?: number;
  car_item_name?: string;
  car_name?: string | null;
  top_speed?: number;
  acceleration?: number;
  braking?: number;
  handling?: number;
  safety?: number;
  dirt?: number;
  tarmac?: number;
  class?: string;
  worth?: number;
  points_spent?: number;
  races_entered?: number;
  races_won?: number;
  is_removed?: boolean;
  // Opaque numeric upgrade-part IDs — Torn's `v2/user/enlistedcars` exposes
  // only the IDs, not names/details, and the catalog endpoints that would
  // resolve them (`carupgrades`, `racing/cars`) return "access level not
  // high enough" for this key. Treat as "upgrade details unavailable from
  // API" rather than guessing what they represent.
  parts?: number[];
}

export interface TornCriminalRecord {
  vandalism?: number;
  theft?: number;
  counterfeiting?: number;
  fraud?: number;
  illicitservices?: number;
  cybercrime?: number;
  extortion?: number;
  illegalproduction?: number;
  total?: number;
}

export interface TornUserData {
  basic?: TornBasic;
  profile?: TornProfile;
  bars?: TornBars;
  battlestats?: TornBattleStats;
  money?: TornMoney;
  merits?: TornMerits;
  travel?: TornTravel;
  networth?: TornNetworth;
  inventory?: TornItemInventory;
  cooldowns?: TornCooldowns;
  items?: Record<string, any>;
  properties?: Record<string, any>;
  equipment?: TornEquipmentItem[];
  enlistedcars?: TornEnlistedCar[];
  criminalrecord?: TornCriminalRecord;
  news?: Record<string, any>;
  timestamp?: number;
}

export interface CharacterOverview {
  name: string;
  playerID: number;
  level: number;
  rank: string;
  life: { current: number; maximum: number };
  energy: { current: number; maximum: number };
  nerve: { current: number; maximum: number };
  happy: { current: number; maximum: number };
  status: TornCharacterStatus;
  battleStatsTotal?: number;
  points: number;
  merits: number;
  // Unix seconds when hospital/jail releases — undefined when not applicable
  // (or when the API reports 0). The only place exact release times are
  // exposed; used by War Readiness to forecast whether a stay clears before
  // war starts instead of guessing.
  hospitalUntil?: number;
  jailUntil?: number;
  factionId?: number;
}

export interface FinancialSnapshot {
  cash: number;
  bank: number;
  stock: number;
  properties: number;
  items: number;
  total: number;
  lastUpdated: number;
}

export interface AdminSummary {
  character: CharacterOverview;
  financial: FinancialSnapshot;
  battlestats?: TornBattleStats;
  equipment?: TornEquipmentItem[];
  enlistedcars?: TornEnlistedCar[];
  criminalRecord?: TornCriminalRecord;
  cooldowns?: TornCooldowns;
  lastSynced: string;
}

export type WatchedItemCategory = "consumable" | "energy" | "happy" | "medical" | "other";

export interface WatchedItem {
  id: number;
  itemName: string;
  category: WatchedItemCategory;
  minTarget: number;
  alertEnabled: boolean;
}

export type CooldownState = "ready" | "waiting" | "unavailable";

export interface CooldownEntry {
  key: string;
  label: string;
  state: CooldownState;
  secondsRemaining?: number;
  detail?: string;
}

export interface SnapshotBattleStats {
  total?: number;
  strength?: number;
  defense?: number;
  speed?: number;
  dexterity?: number;
}

export interface SnapshotCooldowns {
  drug?: number;
  medical?: number;
  booster?: number;
}

// Point-in-time capture used to power trends, forecasting, and advisor
// intelligence (net worth trajectory, stat growth rate, inventory burn rate,
// war readiness forecasting, jump effectiveness, etc). New fields beyond the
// original cash/points/vitals set are optional so older stored rows — which
// predate this shape — still parse cleanly; readers should treat their
// absence as "not captured at this snapshot" rather than zero.
export interface SnapshotPayload {
  capturedAt: string;
  netWorth: number;
  cash: number;
  bank?: number;
  stock?: number;
  propertyValue?: number;
  itemValue?: number;
  points: number;
  merits: number;
  battleStatsTotal?: number;
  battleStats?: SnapshotBattleStats;
  energy: { current: number; maximum: number };
  happy: { current: number; maximum: number };
  nerve: { current: number; maximum: number };
  life?: { current: number; maximum: number };
  status?: TornCharacterStatus;
  cooldowns?: SnapshotCooldowns;
  watchedInventory: Record<string, number>;
}

// Best-effort ranked war window read from `v2/faction/wars`. At the time this
// was written, Howler's Haven had no scheduled ranked war (`wars.ranked` was
// `null`), so we couldn't observe a populated example live — `startMs`/`endMs`
// are read defensively from whichever shape Torn returns when one exists, and
// `source` always reflects whether we actually got usable data from the API.
export interface RankedWarWindow {
  startMs: number;
  endMs?: number;
}

export interface FactionWarStatus {
  rankedWar?: RankedWarWindow;
}

export type TornAccessStatus = "ok" | "denied" | "unavailable" | "error";

export interface TornAccessEntry {
  selection: string;
  label: string;
  status: TornAccessStatus;
  message?: string;
}

export interface TornDataResult {
  data: TornUserData;
  access: TornAccessEntry[];
}

export interface SnapshotMetricDelta {
  key: string;
  label: string;
  from: number;
  to: number;
  change: number;
  changePercent?: number;
}

export interface SnapshotComparison {
  from: SnapshotPayload;
  to: SnapshotPayload;
  elapsedMs: number;
  metrics: SnapshotMetricDelta[];
}

export interface ConsumableUsageEstimate {
  itemName: string;
  currentQuantity: number;
  dailyUsage7d?: number;
  dailyUsage30d?: number;
  daysRemaining?: number;
  hasEnoughHistory: boolean;
}

export interface PublicSummary {
  name: string;
  level: number;
  rank: string;
  status: TornCharacterStatus;
  networth: number;
  cash: number;
  travelStatus: string;
  lastSynced: string;
}
