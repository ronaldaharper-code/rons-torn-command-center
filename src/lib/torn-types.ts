export type TornCharacterStatus = "okay" | "hospital" | "jail" | "traveling" | "unknown";

export interface TornBasic {
  name?: string;
  level?: number;
  rank?: string;
  faction?: string;
  gender?: string;
}

export interface TornProfile {
  status?: string;
  points?: number;
  rankposition?: number;
}

export interface TornStats {
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
}

export interface TornNetworth {
  total?: number;
  cash?: number;
  bank?: number;
  stock?: number;
  items?: number;
  property?: number;
}

export interface TornItemInventory {
  total_items?: number;
  items?: Record<string, { quantity?: number }>;
}

export interface TornUserData {
  basic?: TornBasic;
  profile?: TornProfile;
  stats?: TornStats;
  travel?: TornTravel;
  networth?: TornNetworth;
  inventory?: TornItemInventory;
  items?: Record<string, any>;
  properties?: Record<string, any>;
  news?: Record<string, any>;
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

export interface AdminSummary extends PublicSummary {
  energy?: number;
  nerve?: number;
  happy?: number;
  life?: number;
  drugCooldown?: string;
  boosterCooldown?: string;
  medicalCooldown?: string;
  inventory: Record<string, number>;
  stats?: TornStats;
}
