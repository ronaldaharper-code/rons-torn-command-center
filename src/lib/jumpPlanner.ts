import { inventoryQuantity } from "./torn";
import { formatDualTime, formatDuration } from "./time";
import type { CharacterOverview, CooldownEntry, TornItemInventory } from "./torn-types";
import type { DualTime } from "./time";
import type { JumpStatKey } from "./settings";

// ─── Constants ────────────────────────────────────────────────────────────

const ENERGY_JUMP_TARGET = 900;
const ENERGY_IDEAL_TARGET = 1000;

// Below this energy threshold + drug CD active = likely just completed the
// first training cycle. Used to surface the "use point refill" prompt.
const POST_TRAIN_ENERGY_THRESHOLD = 150;

// ─── Types ────────────────────────────────────────────────────────────────

// The 5-phase model maps onto Shenzy's 7-step process:
//   building-energy   → Step 1 (Xanax → 900+ energy)
//   stacking-happy    → Steps 2-3 (build happy, wait for CDs)
//   take-ecstasy      → Step 4 trigger (all conditions met)
//   post-first-train  → Steps 6-7 (point refill → second cycle), inferred
//   missing-ecstasy   → hard blocker
export type JumpPhase =
  | "building-energy"
  | "stacking-happy"
  | "take-ecstasy"
  | "post-first-train"
  | "missing-ecstasy";

export interface JumpCooldownStatus {
  secondsRemaining: number;
  isReady: boolean;
  detail: string;
  clearsAt?: DualTime;
}

export interface JumpInventory {
  xanax: number;
  ecstasy: number;
  candy: number;
  eroticDvd: number;
}

export interface JumpStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending" | "unavailable";
  detail?: string;
}

export interface JumpPlan {
  phase: JumpPhase;
  phaseLabel: string;
  nextAction: string;

  energy: { current: number; maximum: number };
  happy: { current: number; maximum: number };

  drugCooldown: JumpCooldownStatus;
  boosterCooldown: JumpCooldownStatus;

  inventory: JumpInventory;
  points: number;

  trainingFocusStats: JumpStatKey[];
  edcBenefitAvailable: boolean;

  energyTargetMet: boolean;
  energyTarget: number;
  energyIdeal: number;

  blockerLabel?: string;
  blockerClearsIn?: string;
  blockerClearsAt?: DualTime;
  minutesToReady?: number;

  steps: JumpStep[];
}

export interface JumpPlannerInput {
  character: CharacterOverview;
  cooldownOverview?: CooldownEntry[];
  inventory?: TornItemInventory;
  trainingFocusStats: JumpStatKey[];
  edcBenefitAvailable: boolean;
  localTimeZone: string;
  nowMs?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildCooldownStatus(
  secondsRemaining: number,
  localTimeZone: string,
  nowMs: number,
): JumpCooldownStatus {
  const isReady = secondsRemaining <= 0;
  return {
    secondsRemaining,
    isReady,
    detail: isReady ? "Ready" : formatDuration(secondsRemaining * 1000),
    clearsAt: isReady ? undefined : formatDualTime(nowMs + secondsRemaining * 1000, localTimeZone),
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statLabel(stats: JumpStatKey[]): string {
  return stats.map(capitalize).join(" + ");
}

// ─── Step sequence ────────────────────────────────────────────────────────

function buildSteps(
  phase: JumpPhase,
  energy: { current: number; maximum: number },
  drugCooldown: JumpCooldownStatus,
  boosterCooldown: JumpCooldownStatus,
  inventory: JumpInventory,
  trainingFocusStats: JumpStatKey[],
  points: number,
): JumpStep[] {
  const energyOk = energy.current >= ENERGY_JUMP_TARGET;
  const bothCdsReady = drugCooldown.isReady && boosterCooldown.isReady;
  const isPostTrain = phase === "post-first-train";

  return [
    {
      id: "energy",
      label: `Build energy to ${ENERGY_JUMP_TARGET}+`,
      status: energyOk ? "done" : (!isPostTrain ? "active" : "pending"),
      detail: `${energy.current.toLocaleString()} / ${ENERGY_JUMP_TARGET} target (${ENERGY_IDEAL_TARGET} ideal)`,
    },
    {
      id: "happy",
      label: "Maximize happy",
      status: isPostTrain
        ? "unavailable"
        : energyOk && !bothCdsReady
          ? "active"
          : energyOk && bothCdsReady
            ? "done"
            : "pending",
      detail: "Erotic DVDs, Candy, EDC benefit. Save Ecstasy for the jump trigger.",
    },
    {
      id: "booster-cd",
      label: "Booster cooldown clear",
      status: boosterCooldown.isReady ? "done" : (energyOk ? "active" : "pending"),
      detail: boosterCooldown.isReady
        ? "Clear"
        : `${boosterCooldown.detail}${boosterCooldown.clearsAt ? ` — clears ${boosterCooldown.clearsAt.tct} / ${boosterCooldown.clearsAt.local}` : ""}`,
    },
    {
      id: "drug-cd",
      label: "Drug cooldown clear — take Ecstasy",
      status: isPostTrain
        ? "done"
        : drugCooldown.isReady && energyOk && boosterCooldown.isReady
          ? "active"
          : drugCooldown.isReady && energyOk
            ? "pending"
            : "pending",
      detail: isPostTrain
        ? "Ecstasy taken"
        : drugCooldown.isReady
          ? (inventory.ecstasy > 0 ? `Clear — ${inventory.ecstasy} Ecstasy on hand` : "Clear — no Ecstasy, restock")
          : `${drugCooldown.detail}${drugCooldown.clearsAt ? ` — clears ${drugCooldown.clearsAt.tct} / ${drugCooldown.clearsAt.local}` : ""}`,
    },
    {
      id: "first-train",
      label: `First training cycle — ${statLabel(trainingFocusStats)}`,
      status: isPostTrain ? "done" : phase === "take-ecstasy" ? "active" : "pending",
      detail: isPostTrain
        ? "Completed"
        : phase === "take-ecstasy"
          ? "Take Ecstasy now, then train immediately"
          : "Waiting for prerequisites",
    },
    {
      id: "point-refill",
      label: "Point refill",
      status: isPostTrain ? "active" : "pending",
      detail: isPostTrain
        ? points > 0
          ? `${points.toLocaleString()} point${points !== 1 ? "s" : ""} available`
          : "Points unavailable from API — check in-game"
        : "After first training cycle",
    },
    {
      id: "second-train",
      label: `Second training cycle — ${statLabel(trainingFocusStats)}`,
      status: "unavailable",
      detail: "Cannot verify from API — train after point refill",
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────

export function buildJumpPlan(input: JumpPlannerInput): JumpPlan {
  const { character, cooldownOverview, inventory, trainingFocusStats, edcBenefitAvailable, localTimeZone } = input;
  const nowMs = input.nowMs ?? Date.now();
  const { energy, happy, points } = character;

  const drugEntry = cooldownOverview?.find((e) => e.key === "drug");
  const boosterEntry = cooldownOverview?.find((e) => e.key === "booster");

  const drugCooldown = buildCooldownStatus(drugEntry?.secondsRemaining ?? 0, localTimeZone, nowMs);
  const boosterCooldown = buildCooldownStatus(boosterEntry?.secondsRemaining ?? 0, localTimeZone, nowMs);

  const inv: JumpInventory = {
    xanax: inventoryQuantity(inventory, "Xanax"),
    ecstasy: inventoryQuantity(inventory, "Ecstasy"),
    candy: inventoryQuantity(inventory, "Candy"),
    eroticDvd: inventoryQuantity(inventory, "Erotic DVD"),
  };

  const energyTargetMet = energy.current >= ENERGY_JUMP_TARGET;
  const allCdsReady = drugCooldown.isReady && boosterCooldown.isReady;

  // Post-first-train inference: energy below natural max AND drug CD active.
  // After taking Ecstasy and training, energy was spent and drug CD started.
  const likelyPostFirstTrain =
    !energyTargetMet &&
    energy.current < POST_TRAIN_ENERGY_THRESHOLD &&
    !drugCooldown.isReady;

  // ─── Phase ────────────────────────────────────────────────────────────

  let phase: JumpPhase;
  let phaseLabel: string;
  let nextAction: string;

  if (likelyPostFirstTrain) {
    phase = "post-first-train";
    phaseLabel = "Post-training — refill and train again";
    const ptInfo = points > 0
      ? `You have ${points.toLocaleString()} point${points !== 1 ? "s" : ""}.`
      : "Points unavailable from API — check in-game.";
    nextAction = `Use a point refill to restore energy, then train ${statLabel(trainingFocusStats)} again. ${ptInfo} Drug cooldown clears in ${drugCooldown.detail}.`;
  } else if (!energyTargetMet) {
    phase = "building-energy";
    phaseLabel = "Building energy";
    const xInfo = inv.xanax > 0 ? `${inv.xanax} Xanax on hand.` : "No Xanax on hand — restock.";
    nextAction = `Build energy with Xanax. Need ${(ENERGY_JUMP_TARGET - energy.current).toLocaleString()}+ more to reach ${ENERGY_JUMP_TARGET} target. ${xInfo}`;
  } else if (!allCdsReady) {
    phase = "stacking-happy";
    phaseLabel = "Stack happy — waiting for cooldowns";
    const cdParts: string[] = [];
    if (!drugCooldown.isReady) cdParts.push(`drug cooldown (${drugCooldown.detail})`);
    if (!boosterCooldown.isReady) cdParts.push(`booster cooldown (${boosterCooldown.detail})`);
    const edcHint = edcBenefitAvailable ? " Use EDC benefit (+3,000 happy)." : "";
    const items: string[] = [];
    if (inv.eroticDvd > 0) items.push(`${inv.eroticDvd} Erotic DVD`);
    if (inv.candy > 0) items.push(`${inv.candy} Candy`);
    const itemHint = items.length > 0 ? ` ${items.join(", ")} available.` : "";
    nextAction = `Stack happy — waiting for ${cdParts.join(" and ")} to clear.${edcHint}${itemHint} Save Ecstasy for the trigger.`;
  } else if (inv.ecstasy === 0) {
    phase = "missing-ecstasy";
    phaseLabel = "Blocked — no Ecstasy";
    nextAction = "Energy and cooldowns are ready but you have no Ecstasy. Get at least 1 before proceeding.";
  } else {
    phase = "take-ecstasy";
    phaseLabel = "Take Ecstasy now";
    nextAction = `Take Ecstasy and train ${statLabel(trainingFocusStats)} immediately. All conditions met.`;
  }

  // ─── Blocker timing ───────────────────────────────────────────────────

  let blockerLabel: string | undefined;
  let blockerClearsIn: string | undefined;
  let blockerClearsAt: DualTime | undefined;
  let minutesToReady: number | undefined;

  if (phase === "stacking-happy") {
    const longerSec = Math.max(drugCooldown.secondsRemaining, boosterCooldown.secondsRemaining);
    if (longerSec > 0) {
      blockerLabel = drugCooldown.secondsRemaining >= boosterCooldown.secondsRemaining
        ? "Drug cooldown"
        : "Booster cooldown";
      blockerClearsIn = formatDuration(longerSec * 1000);
      blockerClearsAt = formatDualTime(nowMs + longerSec * 1000, localTimeZone);
      minutesToReady = Math.ceil(longerSec / 60);
    }
  } else if (phase === "take-ecstasy") {
    minutesToReady = 0;
  }

  return {
    phase,
    phaseLabel,
    nextAction,
    energy,
    happy,
    drugCooldown,
    boosterCooldown,
    inventory: inv,
    points,
    trainingFocusStats,
    edcBenefitAvailable,
    energyTargetMet,
    energyTarget: ENERGY_JUMP_TARGET,
    energyIdeal: ENERGY_IDEAL_TARGET,
    blockerLabel,
    blockerClearsIn,
    blockerClearsAt,
    minutesToReady,
    steps: buildSteps(phase, energy, drugCooldown, boosterCooldown, inv, trainingFocusStats, points),
  };
}
