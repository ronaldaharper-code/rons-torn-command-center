import type {
  CharacterOverview,
  TornCooldowns,
  TornItemInventory,
  TornGear,
  TornRaceGarage,
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
  cooldowns?: TornCooldowns;
  inventory?: TornItemInventory;
  watchlist: WatchedItem[];
  // Future hooks: wired up once their data sources land. Each currently
  // contributes no recommendations, but keeping them in the input shape
  // means the engine itself won't need to change when they're filled in.
  bank?: unknown;
  gear?: TornGear;
  garage?: TornRaceGarage;
  warReadiness?: unknown;
  properties?: unknown;
  snapshots?: unknown;
}

const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function inventoryQuantity(inventory: TornItemInventory | undefined, itemName: string): number {
  const entry = Object.values(inventory?.items ?? {}).find(
    (item) => (item?.name ?? "").toLowerCase() === itemName.toLowerCase(),
  );
  return Number(entry?.quantity ?? 0);
}

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
    recommendations.push({
      priority: "high",
      title: "Train now — energy is nearly full",
      explanation: `You have ${energy.current}/${energy.maximum} energy. Letting it cap wastes potential stat gains.`,
      recommendedAction: "Head to the gym and burn your energy on training before it overflows.",
      relatedModule: "training",
      confidenceScore: 0.85,
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

function cooldownRecommendations(cooldowns?: TornCooldowns): Recommendation[] {
  if (!cooldowns) return [];

  const recommendations: Recommendation[] = [];

  if ((cooldowns.drug ?? 0) <= 0) {
    recommendations.push({
      priority: "medium",
      title: "Drug cooldown is clear",
      explanation: "Your drug cooldown has expired, so a Xanax or other drug item is available to use.",
      recommendedAction: "Use a drug item now if you need the energy/nerve boost for training or crimes.",
      relatedModule: "cooldowns",
      confidenceScore: 0.6,
    });
  }

  if ((cooldowns.medical ?? 0) <= 0) {
    recommendations.push({
      priority: "low",
      title: "Medical cooldown is clear",
      explanation: "You're able to use a medical item right now without it being wasted on cooldown.",
      recommendedAction: "Use a medical item if you're below full health or expecting to take damage soon.",
      relatedModule: "cooldowns",
      confidenceScore: 0.5,
    });
  }

  if ((cooldowns.booster ?? 0) <= 0) {
    recommendations.push({
      priority: "low",
      title: "Booster cooldown is clear",
      explanation: "A booster item would not be wasted right now since your booster cooldown has expired.",
      recommendedAction: "Use a booster item if you have one and are about to train or fight.",
      relatedModule: "cooldowns",
      confidenceScore: 0.5,
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

function warReadinessRecommendations(): Recommendation[] {
  return [];
}

function propertyRecommendations(): Recommendation[] {
  return [];
}

function snapshotTrendRecommendations(): Recommendation[] {
  return [];
}

export function buildRecommendations(input: AdvisorInput): Recommendation[] {
  const recommendations: Recommendation[] = [
    ...statusRecommendations(input.character),
    ...vitalsRecommendations(input.character),
    ...cooldownRecommendations(input.cooldowns),
    ...watchlistRecommendations(input.watchlist, input.inventory),
    ...bankRecommendations(),
    ...gearRecommendations(),
    ...garageRecommendations(),
    ...warReadinessRecommendations(),
    ...propertyRecommendations(),
    ...snapshotTrendRecommendations(),
  ];

  return recommendations.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return b.confidenceScore - a.confidenceScore;
  });
}
