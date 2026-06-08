import { inventoryQuantity } from "./torn";
import type {
  CharacterOverview,
  CooldownEntry,
  TornBattleStats,
  TornItemInventory,
} from "./torn-types";

export type JumpReadiness = "ready" | "prepare" | "wait";

export interface JumpRequirement {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface BattleStatShare {
  key: "strength" | "defense" | "speed" | "dexterity";
  label: string;
  value: number;
  percentage: number;
}

export interface JumpPlan {
  readiness: JumpReadiness;
  headline: string;
  summary: string;
  requirements: JumpRequirement[];
  energy: { current: number; maximum: number };
  happy: { current: number; maximum: number };
  xanaxCount: number;
  ecstasyCount: number;
  candyCount: number;
  battleStatsTotal?: number;
  battleStatShares: BattleStatShare[];
}

export interface JumpPlannerInput {
  character: CharacterOverview;
  battleStats?: TornBattleStats;
  cooldownOverview?: CooldownEntry[];
  inventory?: TornItemInventory;
}

const ENERGY_READY_RATIO = 0.8;
const HAPPY_READY_RATIO = 0.75;

function buildBattleStatShares(stats?: TornBattleStats): BattleStatShare[] {
  const entries: { key: BattleStatShare["key"]; label: string; value: number }[] = [
    { key: "strength", label: "Strength", value: stats?.strength ?? 0 },
    { key: "defense", label: "Defense", value: stats?.defense ?? 0 },
    { key: "speed", label: "Speed", value: stats?.speed ?? 0 },
    { key: "dexterity", label: "Dexterity", value: stats?.dexterity ?? 0 },
  ];
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return entries.map((entry) => ({
    ...entry,
    percentage: total > 0 ? (entry.value / total) * 100 : 0,
  }));
}

// A "happy jump" is the Torn technique of stacking a high happy multiplier on
// top of a full energy bar right before a training session for outsized stat
// gains. The five things that make or break the window: energy and happy both
// being high enough to act on, the drug cooldown being clear (so a Xanax lands
// cleanly instead of being wasted), and actually holding the items needed to
// set all of that up (Xanax for energy, Ecstasy/Candy for happy).
export function buildJumpPlan(input: JumpPlannerInput): JumpPlan {
  const { character, battleStats, cooldownOverview, inventory } = input;
  const { energy, happy } = character;

  const xanaxCount = inventoryQuantity(inventory, "Xanax");
  const ecstasyCount = inventoryQuantity(inventory, "Ecstasy");
  const candyCount = inventoryQuantity(inventory, "Candy");
  const happyItemCount = ecstasyCount + candyCount;

  const drugCooldown = cooldownOverview?.find((entry) => entry.key === "drug");
  const drugReady = drugCooldown?.state === "ready";

  const energyReady = energy.maximum > 0 && energy.current >= energy.maximum * ENERGY_READY_RATIO;
  const happyReady = happy.maximum > 0 && happy.current >= happy.maximum * HAPPY_READY_RATIO;

  const requirements: JumpRequirement[] = [
    {
      key: "energy",
      label: "Energy ready to spend",
      met: energyReady,
      detail:
        energy.maximum > 0
          ? `${energy.current}/${energy.maximum} energy${energyReady ? " — plenty to burn on training" : " — let it climb closer to full first"}`
          : "Energy data unavailable",
    },
    {
      key: "happy",
      label: "Happy high enough for bonus gains",
      met: happyReady,
      detail:
        happy.maximum > 0
          ? `${happy.current}/${happy.maximum} happy${happyReady ? " — strong multiplier for training gains" : " — pop a happy item to push this up first"}`
          : "Happy data unavailable",
    },
    {
      key: "drug-cooldown",
      label: "Drug cooldown clear",
      met: drugReady,
      detail: drugReady
        ? "Ready — a Xanax will land cleanly without being wasted"
        : `Still on cooldown${drugCooldown?.detail ? ` (${drugCooldown.detail})` : ""}`,
    },
    {
      key: "xanax",
      label: "Xanax on hand",
      met: xanaxCount > 0,
      detail:
        xanaxCount > 0
          ? `${xanaxCount} on hand — ready to refill energy mid-session`
          : "None on hand — pick some up from the item market before jumping",
    },
    {
      key: "happy-items",
      label: "Happy items on hand (Ecstasy / Candy)",
      met: happyItemCount > 0,
      detail:
        happyItemCount > 0
          ? `${ecstasyCount} Ecstasy, ${candyCount} Candy on hand`
          : "None on hand — stock up so you can push happy higher on demand",
    },
  ];

  const missing = requirements.filter((requirement) => !requirement.met);
  const hasTools = xanaxCount > 0 && happyItemCount > 0;

  let readiness: JumpReadiness;
  let headline: string;
  let summary: string;

  if (missing.length === 0) {
    readiness = "ready";
    headline = "Train now — jump conditions are met";
    summary =
      "Energy, happy, drug cooldown, and consumables are all lined up. This is a strong window to train for maximum stat gain.";
  } else if (hasTools) {
    readiness = "prepare";
    headline = "Prepare for a jump — you already have the tools";
    summary =
      "You're holding the consumables you need. Use your happy/energy items to bring conditions into range, then head to the gym while the boost is active.";
  } else {
    readiness = "wait";
    headline = "Wait and regenerate — not worth jumping yet";
    summary =
      "Conditions and consumables aren't lined up for an efficient jump right now. Let energy and happy regenerate, or restock items first.";
  }

  return {
    readiness,
    headline,
    summary,
    requirements,
    energy,
    happy,
    xanaxCount,
    ecstasyCount,
    candyCount,
    battleStatsTotal: character.battleStatsTotal,
    battleStatShares: buildBattleStatShares(battleStats),
  };
}
