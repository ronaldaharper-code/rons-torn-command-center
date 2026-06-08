export type TornCharacterStatus = "okay" | "hospital" | "jail" | "traveling" | "unknown";

export interface TornBasic {
  name?: string;
  level?: number;
  rank?: string;
  faction?: string;
  gender?: string;
  player_id?: number;
  userID?: number;
  image?: string;
}

export interface TornProfile {
  status?: string;
  points?: number;
  rankposition?: number;
  life?: { current?: number; maximum?: number };
  energy?: { current?: number; maximum?: number };
  nerve?: { current?: number; maximum?: number };
  happy?: { current?: number; maximum?: number };
}

export interface TornStats {
  strength?: { current?: number; maximum?: number };
  defense?: { current?: number; maximum?: number };
  speed?: { current?: number; maximum?: number };
  dexterity?: { current?: number; maximum?: number };
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

export interface TornArmor {
  name?: string;
  damage?: number;
  armor?: number;
  cost?: number;
  ability?: string;
  condition?: number;
}

export interface TornWeapon {
  name?: string;
  damage?: number;
  accuracy?: number;
  type?: string;
  condition?: number;
  cost?: number;
}

export interface TornGear {
  head?: TornArmor;
  body?: TornArmor;
  hand?: TornArmor;
  foot?: TornArmor;
  primary?: TornWeapon;
}

export interface TornRaceGarage {
  [id: string]: {
    name?: string;
    model?: string;
    color?: string;
    condition?: number;
    performance?: number;
  };
}

export interface TornCrimes {
  [id: string]: {
    crime_id?: number;
    crime_name?: string;
    status?: string;
    time_started?: number;
    time_completed?: number;
  };
}

export interface TornChain {
  current?: number;
  max?: number;
  timeout?: number;
  modifiers?: { [key: string]: number };
}

export interface TornUserData {
  basic?: TornBasic;
  profile?: TornProfile;
  stats?: TornStats;
  travel?: TornTravel;
  networth?: TornNetworth;
  inventory?: TornItemInventory;
  cooldowns?: TornCooldowns;
  items?: Record<string, any>;
  properties?: Record<string, any>;
  weapons?: Record<string, TornWeapon>;
  armor?: Record<string, TornArmor>;
  gear?: TornGear;
  garage?: TornRaceGarage;
  crimes?: TornCrimes;
  chain?: TornChain;
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
  chain: { current: number; max: number };
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
  gear?: TornGear;
  garage?: TornRaceGarage;
  crimes?: TornCrimes;
  chain?: TornChain;
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
