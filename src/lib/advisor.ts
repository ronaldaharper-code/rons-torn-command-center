import { inventoryQuantity } from "./torn";
import { buildJumpPlan } from "./jumpPlanner";
import type { JumpPlan } from "./jumpPlanner";
import type { WarReadinessPlan } from "./warReadiness";
import type { GearAdvisorPlan } from "./gearAdvisor";
import type { GarageAdvisorPlan } from "./garageAdvisor";
import type { PropertyAdvisorPlan } from "./propertyAdvisor";
import type { JumpPlannerSettings } from "./settings";
import { DEFAULT_TRAINING_FOCUS_STATS } from "./settings";
import { DEFAULT_LOCAL_TIME_ZONE } from "./time";
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
  jumpPlannerSettings?: JumpPlannerSettings;
  localTimeZone?: string;
  bank?: unknown;
  equipment?: TornEquipmentItem[];
  enlistedcars?: TornEnlistedCar[];
  warReadiness?: WarReadinessPlan;
  gearAdvisor?: GearAdvisorPlan;
  garageAdvisor?: GarageAdvisorPlan;
  propertyAdvisor?: PropertyAdvisorPlan;
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

// Mirrors the Jump Planner page — same plan, surfaced as a dashboard feed item.
function jumpPlannerRecommendations(plan: JumpPlan): Recommendation[] {
  const statLabel = plan.trainingFocusStats
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" + ");

  switch (plan.phase) {
    case "take-ecstasy":
      return [
        {
          priority: "high",
          title: "Take Ecstasy and begin training",
          explanation: `Energy: ${plan.energy.current}/${plan.energy.maximum}. Drug and booster cooldowns are clear. All jump conditions are met.`,
          recommendedAction: `Take Ecstasy now and train ${statLabel} immediately.`,
          relatedModule: "jump-planner",
          confidenceScore: 0.9,
        },
      ];
    case "stacking-happy": {
      const timeInfo = plan.blockerClearsIn ? ` Jump ready in ${plan.blockerClearsIn}.` : "";
      return [
        {
          priority: "medium",
          title: `Energy target reached — stack happy.${timeInfo}`,
          explanation: `Energy ${plan.energy.current} past the ${plan.energyTarget} target. ${plan.blockerLabel ?? "Cooldown"} is the current blocker.`,
          recommendedAction: `Use Erotic DVDs and Candy to build happy.${plan.edcBenefitAvailable ? " Use EDC benefit (+3,000 happy)." : ""} Save Ecstasy for the jump trigger.`,
          relatedModule: "jump-planner",
          confidenceScore: 0.75,
        },
      ];
    }
    case "building-energy":
      return [
        {
          priority: "medium",
          title: "Building energy for happy jump",
          explanation: `Energy: ${plan.energy.current} — below the ${plan.energyTarget} target. ${plan.inventory.xanax} Xanax on hand.`,
          recommendedAction: "Continue building energy with Xanax. Stack happy simultaneously.",
          relatedModule: "jump-planner",
          confidenceScore: 0.65,
        },
      ];
    case "post-first-train":
      return [
        {
          priority: "high",
          title: "Use point refill — then train again",
          explanation: `First training cycle likely complete. Energy is low (${plan.energy.current}). You have ${plan.points.toLocaleString()} points.`,
          recommendedAction: `Use a point refill to restore energy, then complete the second ${statLabel} training cycle.`,
          relatedModule: "jump-planner",
          confidenceScore: 0.7,
        },
      ];
    case "missing-ecstasy":
      return [
        {
          priority: "high",
          title: "Short 1 Ecstasy — jump blocked",
          explanation: `Energy (${plan.energy.current}) and cooldowns are ready but you have no Ecstasy to trigger the jump.`,
          recommendedAction: "Restock Ecstasy before proceeding.",
          relatedModule: "jump-planner",
          confidenceScore: 0.85,
        },
      ];
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

// Translates the Gear Advisor plan into "what should Shenzy do next"
// guidance: missing slots first (can't fight without a weapon/armor), then
// relatively-weak pieces worth a look, then a note when bonus data isn't
// available — always phrased as "review recommended", never "replace",
// matching `buildGearAdvisorPlan`'s conservative stance (we can't prove a
// piece is bad, only that it's relatively weak within Shenzy's own loadout).
function gearRecommendations(plan?: GearAdvisorPlan): Recommendation[] {
  if (!plan || !plan.equipmentDataAvailable) return [];

  const recommendations: Recommendation[] = [];

  for (const slot of plan.missingSlots) {
    const isCoreWeaponOrArmor = slot.key !== "temporary";
    recommendations.push({
      priority: isCoreWeaponOrArmor ? "high" : "medium",
      title: slot.label,
      explanation: slot.detail,
      recommendedAction: "Equip something from inventory or pick up a replacement before relying on this loadout in a fight.",
      relatedModule: "gear",
      confidenceScore: 0.7,
    });
  }

  if (plan.missingSlots.length === 0 && plan.loadout.primary) {
    recommendations.push({
      priority: "low",
      title: "Primary weapon equipped and acceptable",
      explanation: `${plan.loadout.primary.name} is equipped in the primary slot${
        plan.loadout.primary.bonuses.length > 0 ? ` with the ${plan.loadout.primary.bonuses[0].title} bonus active` : ""
      }.`,
      recommendedAction: "No action needed — keep this slot filled.",
      relatedModule: "gear",
      confidenceScore: 0.5,
    });
  }

  for (const highlight of plan.reviewRecommended) {
    recommendations.push({
      priority: "medium",
      title: `Review recommended: ${highlight.item.name}`,
      explanation: `${highlight.reason} Armor looks underpowered for ranked war if this is one of the pieces you'd be relying on.`,
      recommendedAction: "Review this piece before the next ranked war — consider whether a stronger alternative is available, but it's not necessarily a replacement.",
      relatedModule: "gear",
      confidenceScore: 0.45,
    });
  }

  if (!plan.bonusDataAvailable) {
    recommendations.push({
      priority: "low",
      title: "Gear data available, but bonus details unavailable from API",
      explanation: "Torn is returning Shenzy's equipped items, but not the richer stat/bonus detail right now — so named bonuses (like Deadeye or Impregnable) can't be confirmed from here.",
      recommendedAction: "Check the Gear Advisor page directly in-game if you need to confirm bonus details before war.",
      relatedModule: "gear",
      confidenceScore: 0.4,
    });
  } else {
    const namedArmorBonuses = plan.loadout.armor.filter((piece) => piece.bonuses.length > 0);
    if (namedArmorBonuses.length > 0) {
      recommendations.push({
        priority: "low",
        title: "Consider reviewing armor bonuses before next ranked war",
        explanation: `${namedArmorBonuses.map((piece) => `${piece.name} (${piece.bonuses[0].title})`).join(", ")} carry named bonuses — worth confirming they still match Shenzy's preferred war setup.`,
        recommendedAction: "Open the Gear Advisor to review armor bonuses and confirm the loadout is what you want going into war.",
        relatedModule: "gear",
        confidenceScore: 0.35,
      });
    }
  }

  return recommendations;
}

// Translates the Racing Garage Advisor plan into "what should Shenzy do
// next" guidance: whether garage data exists at all, the best win-rate car,
// Class C focus (Shenzy's stated priority), and weak areas worth a look —
// always "review recommended", and always honest that upgrade/part *details*
// aren't available from the API at this key's access level. We do not fill
// that gap with community racing strategy presented as fact.
function garageRecommendations(plan?: GarageAdvisorPlan): Recommendation[] {
  if (!plan) return [];

  if (!plan.garageDataAvailable) {
    return [
      {
        priority: "low",
        title: "No racing data available",
        explanation: plan.summary,
        recommendedAction: "Enlist a car in the garage to start building race history and unlock racing guidance here.",
        relatedModule: "garage",
        confidenceScore: 0.4,
      },
    ];
  }

  const recommendations: Recommendation[] = [];

  if (plan.bestCar) {
    recommendations.push({
      priority: "low",
      title: `Best win-rate car appears to be ${plan.bestCar.car.name}`,
      explanation: plan.bestCar.reason,
      recommendedAction: "Lean on this car for races where win rate matters most — and keep an eye on it as more race history comes in.",
      relatedModule: "garage",
      confidenceScore: plan.bestCar.car.racesEntered > 0 ? 0.55 : 0.3,
    });
  }

  if (plan.classCCars.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "Class C car data available — review handling upgrades",
      explanation: `Shenzy has ${plan.classCCars.length} Class C car${plan.classCCars.length === 1 ? "" : "s"} enlisted (${plan.classCCars.map((car) => car.name).join(", ")}). Garage data is available for these, but the API isn't returning what upgrades are installed or recommended.`,
      recommendedAction: "Review handling upgrades for these cars in-game — we can show installed-part counts, but not what the parts are or whether they're optimal.",
      relatedModule: "garage",
      confidenceScore: 0.5,
    });
  } else {
    recommendations.push({
      priority: "low",
      title: "No Class C cars enlisted",
      explanation: "Shenzy's racing focus is Class C, but none of the currently-enlisted cars are in that class.",
      recommendedAction: "Consider enlisting a Class C car if that's the racing tier you want to focus on.",
      relatedModule: "garage",
      confidenceScore: 0.35,
    });
  }

  for (const weak of plan.weakAreas) {
    recommendations.push({
      priority: "low",
      title: `Review recommended: ${weak.car.name} — ${weak.statLabel.toLowerCase()}`,
      explanation: weak.reason,
      recommendedAction: "Review this car's setup before relying on it for races where that stat matters — not necessarily a sign it needs replacing.",
      relatedModule: "garage",
      confidenceScore: 0.4,
    });
  }

  recommendations.push({
    priority: "low",
    title: "Garage data available, but upgrade details are unavailable from API",
    explanation: "Torn is returning Shenzy's enlisted cars and race results, but the catalog endpoints that would explain what each car's installed parts do (or what to install next) return \"access level not high enough\" for this key.",
    recommendedAction: "Treat any upgrade guidance from outside the API (wiki, community strategy) as opinion, not fact, and confirm details in-game before spending points.",
    relatedModule: "garage",
    confidenceScore: 0.35,
  });

  return recommendations;
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

// Translates the Property Advisor plan into "what should Shenzy do next"
// guidance: rental extension timing (only when the API actually reports
// days remaining — Shenzy's stated preference is offer-at-10-days,
// urgent-under-5), manual-reminder follow-ups for whatever the API doesn't
// cover, and an honest note when end-date/renter detail is missing rather
// than guessed at. Mirrors garageRecommendations()'s conservative shape.
function propertyRecommendations(plan?: PropertyAdvisorPlan): Recommendation[] {
  if (!plan) return [];

  if (!plan.propertyDataAvailable) {
    return [
      {
        priority: "low",
        title: "No property data available",
        explanation: plan.summary,
        recommendedAction: "Own or rent a property to start seeing rental and upkeep guidance here.",
        relatedModule: "properties",
        confidenceScore: 0.4,
      },
    ];
  }

  const recommendations: Recommendation[] = [];

  for (const alert of plan.rentalAlerts) {
    if (alert.urgency === "urgent") {
      recommendations.push({
        priority: "high",
        title: `Rental is urgent — under ${plan.urgentReminderDays} days remaining`,
        explanation: alert.reason,
        recommendedAction: `Offer ${alert.property.name} an extension now, or plan for the rental to end in ${alert.daysRemaining} day${alert.daysRemaining === 1 ? "" : "s"}.`,
        relatedModule: "properties",
        confidenceScore: 0.7,
      });
    } else if (alert.urgency === "offer-now") {
      recommendations.push({
        priority: "medium",
        title: `Offer extension now — renter has ${alert.daysRemaining} days remaining`,
        explanation: alert.reason,
        recommendedAction: `Reach out to ${alert.property.rental?.renterName ?? "the renter"} about extending the lease on ${alert.property.name}.`,
        relatedModule: "properties",
        confidenceScore: 0.65,
      });
    } else {
      const opensIn = alert.daysRemaining - plan.extensionReminderDays;
      recommendations.push({
        priority: "low",
        title: `Rental extension window opens in ${opensIn} day${opensIn === 1 ? "" : "s"}`,
        explanation: alert.reason,
        recommendedAction: `No action needed yet — ${alert.property.name} crosses the ${plan.extensionReminderDays}-day extension-offer threshold in ${opensIn} day${opensIn === 1 ? "" : "s"}.`,
        relatedModule: "properties",
        confidenceScore: 0.5,
      });
    }
  }

  if (!plan.rentalTimingAvailable && plan.rentedProperties.length > 0) {
    recommendations.push({
      priority: "medium",
      title: "Property data available, but renter/end-date details unavailable from API",
      explanation: `Shenzy has ${plan.rentedProperties.length} rented propert${plan.rentedProperties.length === 1 ? "y" : "ies"}, but Torn isn't returning rental end-date or renter detail for ${plan.rentedProperties.length === 1 ? "it" : "them"} right now.`,
      recommendedAction: plan.hasManualReminders
        ? "Keep manual rental reminders up to date for these properties — they're filling the gap the API leaves."
        : "Manual rental reminder recommended — add one in Settings with the rental's expected end date so timing isn't missed.",
      relatedModule: "properties",
      confidenceScore: 0.45,
    });
  }

  for (const alert of plan.manualReminderAlerts) {
    if (alert.urgency === "overdue" || alert.urgency === "urgent") {
      recommendations.push({
        priority: alert.urgency === "overdue" ? "medium" : "high",
        title: `Manual reminder: ${alert.reminder.propertyLabel} — ${alert.urgency === "overdue" ? "overdue" : "urgent"}`,
        explanation: alert.reason,
        recommendedAction: "Review this rental and update or clear the manual reminder once it's handled.",
        relatedModule: "properties",
        confidenceScore: 0.5,
      });
    } else if (alert.urgency === "offer-now") {
      recommendations.push({
        priority: "medium",
        title: `Manual reminder: offer extension — ${alert.reminder.propertyLabel}`,
        explanation: alert.reason,
        recommendedAction: "Reach out about extending this rental based on the manually-tracked end date.",
        relatedModule: "properties",
        confidenceScore: 0.45,
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "low",
      title: "Rentals on track",
      explanation: plan.summary,
      recommendedAction: `No extension offers needed yet — Shenzy's preferred thresholds (offer at ${plan.extensionReminderDays} days, urgent under ${plan.urgentReminderDays}) aren't currently triggered.`,
      relatedModule: "properties",
      confidenceScore: 0.4,
    });
  }

  return recommendations;
}

function snapshotTrendRecommendations(): Recommendation[] {
  return [];
}

export function buildRecommendations(input: AdvisorInput): Recommendation[] {
  const jumpPlan = buildJumpPlan({
    character: input.character,
    cooldownOverview: input.cooldownOverview,
    inventory: input.inventory,
    trainingFocusStats: input.jumpPlannerSettings?.trainingFocusStats ?? DEFAULT_TRAINING_FOCUS_STATS,
    edcBenefitAvailable: input.jumpPlannerSettings?.edcBenefitAvailable ?? true,
    localTimeZone: input.localTimeZone ?? DEFAULT_LOCAL_TIME_ZONE,
  });

  const recommendations: Recommendation[] = [
    ...statusRecommendations(input.character),
    ...vitalsRecommendations(input.character),
    ...cooldownRecommendations(input.character, input.cooldownOverview, input.inventory),
    ...jumpPlannerRecommendations(jumpPlan),
    ...watchlistRecommendations(input.watchlist, input.inventory),
    ...consumableUsageRecommendations(input.usageEstimates),
    ...bankRecommendations(),
    ...gearRecommendations(input.gearAdvisor),
    ...garageRecommendations(input.garageAdvisor),
    ...warReadinessRecommendations(input.warReadiness),
    ...propertyRecommendations(input.propertyAdvisor),
    ...snapshotTrendRecommendations(),
  ];

  return recommendations.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return b.confidenceScore - a.confidenceScore;
  });
}
