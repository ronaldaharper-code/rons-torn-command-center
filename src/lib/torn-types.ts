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

export interface TornProfile {
  status?: string;
  rank?: string;
  rankposition?: number;
  life?: { current?: number; maximum?: number };
  energy?: { current?: number; maximum?: number };
  nerve?: { current?: number; maximum?: number };
  happy?: { current?: number; maximum?: number };
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
  races_entered?: number;
  races_won?: number;
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

export interface SnapshotPayload {
  capturedAt: string;
  netWorth: number;
  cash: number;
  bank?: number;
  points: number;
  merits: number;
  battleStatsTotal?: number;
  energy: { current: number; maximum: number };
  happy: { current: number; maximum: number };
  nerve: { current: number; maximum: number };
  watchedInventory: Record<string, number>;
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
