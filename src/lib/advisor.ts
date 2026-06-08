import { inventoryQuantity } from "./torn";
import { buildJumpPlan } from "./jumpPlanner";
import type { JumpPlan } from "./jumpPlanner";
import type { WarReadinessPlan } from "./warReadiness";
import type {
  CharacterOverview,
  CooldownEntry,
  ConsumableUsageEstimate,
  TornBattleStats,
  TornCooldowns,
  TornItemInventory,
  TornEquipmentItem,
  TornEnlistedCar,
  WatchedItem,
} from "./torn-types";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  priority: RecommendationPriority;
  title: string;
  explanation: string;
  recommendedAction: string;
  relatedModule: string;
  confidenceScore: number;
}

export interface AdvisorInput {
  character: CharacterOverview;
  battleStats?: TornBattleStats;
  cooldowns?: TornCooldowns;
  cooldownOverview?: CooldownEntry[];
  inventory?: TornItemInventory;
  watchlist: WatchedItem[];
  usageEstimates?: ConsumableUsageEstimate[];
  // Future hooks: wired up once their data sources land. Each currently
  // contributes no recommendations, but keeping them in the input shape
  // means the engine itself won't need to change when they're filled in.
  bank?: unknown;
  equipment?: TornEquipmentItem[];
  enlistedcars?: TornEnlistedCar[];
  warReadiness?: WarReadinessPlan;
  properties?: unknown;
  snapshots?: unknown;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function statusRecommendations(character: CharacterOverview): Recommendation[] {
  switch (character.status) {
    case "hospital":
      return [
        {
          priority: "critical",
          title: "Recover before doing anything else",
          explanation: "You're in the hospital and can't train, work, or fight effectively right now.",
          recommendedAction: "Wait it out or use a medical item to heal faster, then resume your plan.",
          relatedModule: "character-status",
          confidenceScore: 0.95,
        },
      ];
    case "jail":
      return [
        {
          priority: "high",
          title: "You're in jail",
          explanation: "Crimes, training, and travel are blocked while you're locked up.",
          recommendedAction: "Wait for release or have a faction member bust you out.",
          relatedModule: "character-status",
          confidenceScore: 0.9,
        },
      ];
    case "traveling":
      return [
        {
          priority: "medium",
          title: "You're currently traveling",
          explanation: "Most actions are unavailable until you land at your destination.",
          recommendedAction: "Use this time to plan your next moves — check your watchlist and cooldowns for when you arrive.",
          relatedModule: "character-status",
          confidenceScore: 0.7,
        },
      ];
    default:
      return [];
  }
}

function vitalsRecommendations(character: CharacterOverview): Recommendation[] {
  if (character.status !== "okay") return [];

  const recommendations: Recommendation[] = [];
  const { energy, nerve, happy } = character;

  if (energy.maximum > 0 && energy.current >= energy.maximum * 0.8) {
    const happyBoost = happy.maximum > 0 && happy.current >= happy.maximum * 0.75;
    recommendations.push({
      priority: happyBoost ? "critical" : "high",
      title: happyBoost ? "Prime training window — energy and happy both high" : "Train now — energy is nearly full",
      explanation: happyBoost
        ? `Energy is at ${energy.current}/${energy.maximum} and happy is at ${happy.current}/${happy.maximum} — this combination maximizes stat gain per train.`
        : `You have ${energy.current}/${energy.maximum} energy. Letting it cap wastes potential stat gains.`,
      recommendedAction: happyBoost
        ? "Head to the gym now and spend your energy while the happy bonus is active — about as good as training conditions get."
        : "Head to the gym and burn your energy on training before it overflows.",
      relatedModule: "training",
      confidenceScore: happyBoost ? 0.9 : 0.85,
    });
  } else if (energy.maximum > 0 && energy.current < energy.maximum * 0.2) {
    recommendations.push({
      priority: "low",
      title: "Energy is low",
      explanation: `Energy is at ${energy.current}/${energy.maximum}. Training now would be inefficient.`,
      recommendedAction: "Let energy regenerate, or use an energy refill/booster if one is available.",
      relatedModule: "training",
      confidenceScore: 0.6,
    });
  }

  if (nerve.maximum > 0 && nerve.current >= nerve.maximum * 0.8) {
    recommendations.push({
      priority: "medium",
      title: "Nerve is high — good time for crimes",
      explanation: `Nerve is at ${nerve.current}/${nerve.maximum}, giving you a strong window for crime attempts.`,
      recommendedAction: "Run your highest-value available crimes while nerve is plentiful.",
      relatedModule: "crimes",
      confidenceScore: 0.7,
    });
  }

  if (happy.maximum > 0 && happy.current < happy.maximum * 0.5) {
    recommendations.push({
      priority: "medium",
      title: "Happy is below half",
      explanation: `Happy is at ${happy.current}/${happy.maximum}. Low happy reduces training gains and jump potential.`,
      recommendedAction: "Use a happy item (candy, ecstasy) to top up before your next jump or training session.",
      relatedModule: "jump-planner",
      confidenceScore: 0.65,
    });
  } else if (happy.maximum > 0 && happy.current >= happy.maximum * 0.9) {
    recommendations.push({
      priority: "high",
      title: "Happy jump conditions look ready",
      explanation: `Happy is at ${happy.current}/${happy.maximum} — close to the level needed for an efficient happy jump.`,
      recommendedAction: "Check the Jump Planner and consider triggering your jump now for maximum stat gain.",
      relatedModule: "jump-planner",
      confidenceScore: 0.7,
    });
  }

  return recommendations;
}

function cooldownRecommendations(
  character: CharacterOverview,
  overview?: CooldownEntry[],
  inventory?: TornItemInventory,
): Recommendation[] {
  if (!overview || overview.length === 0) return [];

  const recommendations: Recommendation[] = [];
  const byKey = new Map(overview.map((entry) => [entry.key, entry]));

  const drug = byKey.get("drug");
  if (drug?.state === "ready") {
    const xanaxCount = inventoryQuantity(inventory, "Xanax");
    recommendations.push({
      priority: xanaxCount > 0 ? "medium" : "low",
      title: xanaxCount > 0 ? "Drug cooldown ready — Xanax in stock" : "Drug cooldown ready",
      explanation:
        xanaxCount > 0
          ? `Your drug cooldown is clear and you have ${xanaxCount} Xanax on hand — a strong combo for an energy-fueled training session.`
          : "Your drug cooldown has expired, so a drug item would land cleanly, but you don't currently have one in inventory.",
      recommendedAction:
        xanaxCount > 0
          ? "Pop a Xanax now to refill energy and extend your training session while the cooldown is clear."
          : "Pick up a Xanax (or your preferred drug item) from the item market so the next clear window doesn't go to waste.",
      relatedModule: "cooldowns",
      confidenceScore: xanaxCount > 0 ? 0.7 : 0.5,
    });
  } else if (drug?.state === "waiting") {
    const xanaxCount = inventoryQuantity(inventory, "Xanax");
    if (xanaxCount > 0) {
      recommendations.push({
        priority: "low",
        title: "Drug cooldown active — hold your Xanax",
        explanation: `Your drug cooldown is still running${drug.detail ? ` (${drug.detail})` : ""}. Using a Xanax now would be wasted.`,
        recommendedAction: `Hold your ${xanaxCount} Xanax until the cooldown clears, then time it with your next training session.`,
        relatedModule: "cooldowns",
        confidenceScore: 0.45,
      });
    }
  }

  const booster = byKey.get("booster");
  if (booster?.state === "ready") {
    recommendations.push({
      priority: "low",
      title: "Booster cooldown ready",
      explanation: "A booster item would not be wasted right now since your booster cooldown has expired.",
      recommendedAction: "Use a booster item if you have one and are about to train or fight.",
      relatedModule: "cooldowns",
      confidenceScore: 0.5,
    });
  } else if (booster?.state === "waiting") {
    recommendations.push({
      priority: "low",
      title: "Booster cooldown active",
      explanation: `Your booster cooldown is still running${booster.detail ? ` (${booster.detail})` : ""}, so using another would be wasted.`,
      recommendedAction: "Hold off on booster items until the cooldown clears.",
      relatedModule: "cooldowns",
      confidenceScore: 0.4,
    });
  }

  const medical = byKey.get("medical");
  if (medical?.state === "ready" && character.life.maximum > 0 && character.life.current < character.life.maximum) {
    recommendations.push({
      priority: "medium",
      title: "Medical cooldown warning",
      explanation: `You're below full health (${character.life.current}/${character.life.maximum}) and your medical cooldown is clear.`,
      recommendedAction: "Use a medical item now to heal efficiently before the cooldown resets on its own.",
      relatedModule: "cooldowns",
      confidenceScore: 0.55,
    });
  }

  const crime = byKey.get("crime");
  if (crime?.state === "ready") {
    recommendations.push({
      priority: "medium",
      title: "Crime cooldown ready",
      explanation: "Your crime cooldown is clear, so an attempt right now won't be wasted on cooldown.",
      recommendedAction: "Run your highest-value available crime while the cooldown is open.",
      relatedModule: "crimes",
      confidenceScore: 0.5,
    });
  }

  return recommendations;
}

// Builds on `buildJumpPlan` (shared with the Jump Planner page) so the
// readiness call here always matches what the planner shows in detail —
// "wait" produces no recommendation since there's nothing actionable to do.
function jumpPlannerRecommendations(plan: JumpPlan): Recommendation[] {
  switch (plan.readiness) {
    case "ready":
      return [
        {
          priority: "high",
          title: plan.headline,
          explanation: plan.summary,
          recommendedAction: "Open the Jump Planner, pop your happy/energy items, then head to the gym while the boost is active.",
          relatedModule: "jump-planner",
          confidenceScore: 0.8,
        },
      ];
    case "prepare":
      return [
        {
          priority: "medium",
          title: plan.headline,
          explanation: plan.summary,
          recommendedAction: "Check the Jump Planner for exactly which requirements are still unmet, then line them up before training.",
          relatedModule: "jump-planner",
          confidenceScore: 0.6,
        },
      ];
    case "wait":
    default:
      return [];
  }
}

function consumableUsageRecommendations(estimates?: ConsumableUsageEstimate[]): Recommendation[] {
  if (!estimates || estimates.length === 0) return [];

  const recommendations: Recommendation[] = [];

  for (const estimate of estimates) {
    if (!estimate.hasEnoughHistory || estimate.daysRemaining === undefined) continue;
    if (estimate.daysRemaining > 7) continue;

    const isCritical = estimate.daysRemaining <= 2;
    recommendations.push({
      priority: isCritical ? "high" : "medium",
      title: `${estimate.itemName} running low at current usage`,
      explanation: `At your recent usage rate, your ${estimate.currentQuantity} ${estimate.itemName} will run out in about ${Math.round(estimate.daysRemaining)} day${Math.round(estimate.daysRemaining) === 1 ? "" : "s"}.`,
      recommendedAction: `Restock ${estimate.itemName} soon to avoid running dry based on your burn rate.`,
      relatedModule: "consumables",
      confidenceScore: isCritical ? 0.75 : 0.6,
    });
  }

  return recommendations;
}

function watchlistRecommendations(watchlist: WatchedItem[], inventory?: TornItemInventory): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const watched of watchlist) {
    if (!watched.alertEnabled) continue;

    const onHand = inventoryQuantity(inventory, watched.itemName);
    if (onHand >= watched.minTarget) continue;

    const deficit = watched.minTarget - onHand;
    const isOut = onHand === 0;

    recommendations.push({
      priority: isOut ? "high" : "medium",
      title: `Buy more ${watched.itemName}`,
      explanation: isOut
        ? `You're completely out of ${watched.itemName}, but your watchlist target is ${watched.minTarget}.`
        : `You have ${onHand} ${watched.itemName}, which is ${deficit} below your watchlist target of ${watched.minTarget}.`,
      recommendedAction: `Restock ${watched.itemName} from the item market to stay above your minimum target.`,
      relatedModule: "watchlist",
      confidenceScore: isOut ? 0.85 : 0.65,
    });
  }

  return recommendations;
}

// --- Future hooks -----------------------------------------------------
// These return no recommendations until their underlying data sources
// (bank/stocks, gear scoring, racing telemetry, faction war state,
// property/rental tracking, and historical snapshots) are wired up.
// Keeping them as named no-ops documents intent and means buildRecommendations
// won't need restructuring when each lands — just give the stub its input
// and fill in the rules.

function bankRecommendations(): Recommendation[] {
  return [];
}

function gearRecommendations(): Recommendation[] {
  return [];
}

function garageRecommendations(): Recommendation[] {
  return [];
}

// Translates the War Readiness plan into "what should Shenzy do next"
// guidance: the live countdown, anything actively blocking a fight, the
// concrete prep actions, and (when it's actionable) Vicodin timing — kept
// conservative throughout, matching `buildWarReadinessPlan`'s "warn rather
// than overpromise" stance.
function warReadinessRecommendations(plan?: WarReadinessPlan): Recommendation[] {
  if (!plan) return [];

  const recommendations: Recommendation[] = [];

  if (plan.warTime.startMs === undefined) {
    recommendations.push({
      priority: "low",
      title: "Set your ranked war start time",
      explanation: "Torn isn't reporting a scheduled ranked war for your faction, and no manual time is set — the War Readiness Countdown can't forecast anything without one.",
      recommendedAction: "Add a ranked war start time in Settings to unlock the countdown, readiness forecast, and Vicodin timing guidance.",
      relatedModule: "war-readiness",
      confidenceScore: 0.5,
    });
    return recommendations;
  }

  recommendations.push({
    priority: plan.score < 50 ? "critical" : plan.score < 80 ? "high" : "medium",
    title: `War starts in ${plan.warTime.timeUntil} — ${plan.readyNow ? "ready now" : "not ready yet"}`,
    explanation: plan.summary,
    recommendedAction: plan.readyNow
      ? "Keep your readiness score up — recheck the countdown as war start gets closer."
      : "Work through the War Readiness Countdown's blocking issues before war begins.",
    relatedModule: "war-readiness",
    confidenceScore: 0.7,
  });

  for (const issue of plan.blockingIssues) {
    if (issue.severity === "medium") continue;
    recommendations.push({
      priority: issue.severity === "critical" ? "critical" : "high",
      title: `Not war ready: ${issue.label.toLowerCase()}`,
      explanation: issue.detail,
      recommendedAction: "Resolve this before war starts — it's actively blocking you from fighting.",
      relatedModule: "war-readiness",
      confidenceScore: 0.7,
    });
  }

  for (const action of plan.recommendedActions) {
    recommendations.push({
      priority: "medium",
      title: action.label,
      explanation: action.detail,
      recommendedAction: action.label,
      relatedModule: "war-readiness",
      confidenceScore: 0.55,
    });
  }

  if (plan.vicodinGuidance.verdict !== "no-vicodin" && plan.vicodinGuidance.verdict !== "unknown") {
    recommendations.push({
      priority: plan.vicodinGuidance.verdict === "take-now" ? "medium" : "low",
      title: plan.vicodinGuidance.headline,
      explanation: plan.vicodinGuidance.detail,
      recommendedAction: plan.vicodinGuidance.headline,
      relatedModule: "war-readiness",
      confidenceScore: 0.5,
    });
  }

  return recommendations;
}

function propertyRecommendations(): Recommendation[] {
  return [];
}

function snapshotTrendRecommendations(): Recommendation[] {
  return [];
}

export function buildRecommendations(input: AdvisorInput): Recommendation[] {
  const jumpPlan = buildJumpPlan({
    character: input.character,
    battleStats: input.battleStats,
    cooldownOverview: input.cooldownOverview,
    inventory: input.inventory,
  });

  const recommendations: Recommendation[] = [
    ...statusRecommendations(input.character),
    ...vitalsRecommendations(input.character),
    ...cooldownRecommendations(input.character, input.cooldownOverview, input.inventory),
    ...jumpPlannerRecommendations(jumpPlan),
    ...watchlistRecommendations(input.watchlist, input.inventory),
    ...consumableUsageRecommendations(input.usageEstimates),
    ...bankRecommendations(),
    ...gearRecommendations(),
    ...garageRecommendations(),
    ...warReadinessRecommendations(input.warReadiness),
    ...propertyRecommendations(),
    ...snapshotTrendRecommendations(),
  ];

  return recommendations.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return b.confidenceScore - a.confidenceScore;
  });
}
