// Pure planning module for the Gear Advisor — mirrors the `warReadiness.ts`
// pattern (and `jumpPlanner.ts` before it): one function takes raw API data
// in, returns a fully-formed plan, and both the UI and `advisor.ts` consume
// the same plan so their verdicts can never disagree.
//
// Core question this answers: "Is Shenzy equipped properly for training,
// defending, and ranked war?" — not just "what gear does Shenzy have?"

import type { TornBattleStats, TornEquipmentDetail, TornEquipmentItem } from "./torn-types";

export interface GearPieceStats {
  damage?: number | null;
  accuracy?: number | null;
  armor?: number | null;
  quality?: number | null;
}

export interface GearPieceBonus {
  title: string;
  description?: string;
  value?: number;
}

export interface GearPiece {
  uid?: number;
  name: string;
  /** Canonical slot category from the v1 list: Primary/Secondary/Melee/Defensive/Temporary/Enhancer/Clothing/etc. */
  category: string;
  subType?: string | null;
  marketValue?: number;
  /** `null`/`undefined` when the richer v2 detail couldn't be joined — distinct from "API confirmed no stats". */
  stats?: GearPieceStats | null;
  bonuses: GearPieceBonus[];
  rarity?: string | null;
  /** False when we couldn't join this item to the v2 detail feed — bonuses/stats shown should read "unavailable", not "none". */
  detailAvailable: boolean;
}

export interface GearMissingSlot {
  key: string;
  label: string;
  detail: string;
}

export interface GearHighlight {
  item: GearPiece;
  reason: string;
}

export interface GearAdvisorPlan {
  headline: string;
  summary: string;
  loadout: {
    primary?: GearPiece;
    secondary?: GearPiece;
    melee?: GearPiece;
    temporary?: GearPiece;
    armor: GearPiece[];
    other: GearPiece[];
  };
  missingSlots: GearMissingSlot[];
  strongest?: GearHighlight;
  weakest?: GearHighlight;
  /** Conservative — "review recommended", never "replace": we can't prove an item is bad, only that it's relatively weak within Shenzy's own loadout. */
  reviewRecommended: GearHighlight[];
  /** True only when the v2 detail feed returned data — controls whether bonus/quality claims are shown or labeled "unavailable from API". */
  bonusDataAvailable: boolean;
  equipmentDataAvailable: boolean;
  battleStatsTotal?: number;
  battleStatsNote: string;
}

export interface GearAdvisorInput {
  equipment?: TornEquipmentItem[];
  equipmentDetails?: TornEquipmentDetail[];
  battlestats?: TornBattleStats;
}

const CORE_WEAPON_SLOTS: { key: "primary" | "secondary" | "melee" | "temporary"; category: string; label: string }[] = [
  { key: "primary", category: "Primary", label: "Primary weapon" },
  { key: "secondary", category: "Secondary", label: "Secondary weapon" },
  { key: "melee", category: "Melee", label: "Melee weapon" },
  { key: "temporary", category: "Temporary", label: "Temporary weapon" },
];

// An item is "low quality relative to the rest of the loadout" when its
// quality stat sits well below the average of every stat-bearing piece —
// a comparison to Shenzy's own gear, not an invented external benchmark.
const REVIEW_RECOMMENDED_RATIO = 0.6;

function buildPiece(item: TornEquipmentItem, detail: TornEquipmentDetail | undefined): GearPiece {
  const detailAvailable = detail !== undefined;
  return {
    uid: item.UID,
    name: item.name ?? "Unknown item",
    category: item.type ?? "Unknown",
    subType: detail?.sub_type ?? null,
    marketValue: item.market_price,
    stats: detailAvailable ? detail?.stats ?? null : undefined,
    bonuses: detailAvailable
      ? (detail?.bonuses ?? []).map((bonus) => ({
          title: bonus.title ?? "Unnamed bonus",
          description: bonus.description,
          value: bonus.value,
        }))
      : [],
    rarity: detailAvailable ? detail?.rarity ?? null : undefined,
    detailAvailable,
  };
}

function describeBattleStats(total: number | undefined): string {
  if (total === undefined) {
    return "Battle stat totals aren't available, so gear can't be weighed against Shenzy's current power level.";
  }
  return `Shenzy's total battle stats are ${total.toLocaleString()}. Torn's API doesn't expose a benchmark for "ideal gear at this stat level," so treat any comparison below as relative to Shenzy's own loadout — not an external standard.`;
}

export function buildGearAdvisorPlan(input: GearAdvisorInput): GearAdvisorPlan {
  const { equipment, equipmentDetails, battlestats } = input;
  const battleStatsTotal = battlestats?.total;
  const battleStatsNote = describeBattleStats(battleStatsTotal);

  if (!equipment || equipment.length === 0) {
    return {
      headline: "No equipped gear data available",
      summary: "Torn isn't returning any equipped items for Shenzy right now — check back once gear data is available before drawing conclusions.",
      loadout: { armor: [], other: [] },
      missingSlots: [],
      reviewRecommended: [],
      bonusDataAvailable: false,
      equipmentDataAvailable: false,
      battleStatsTotal,
      battleStatsNote,
    };
  }

  const detailByUid = new Map<number, TornEquipmentDetail>();
  for (const detail of equipmentDetails ?? []) {
    if (typeof detail.uid === "number") detailByUid.set(detail.uid, detail);
  }
  const bonusDataAvailable = (equipmentDetails?.length ?? 0) > 0;

  const pieces = equipment.map((item) => buildPiece(item, typeof item.UID === "number" ? detailByUid.get(item.UID) : undefined));

  // --- Loadout grouping ----------------------------------------------------
  const byCategory = (category: string) => pieces.filter((piece) => piece.category === category);
  const loadout: GearAdvisorPlan["loadout"] = {
    primary: byCategory("Primary")[0],
    secondary: byCategory("Secondary")[0],
    melee: byCategory("Melee")[0],
    temporary: byCategory("Temporary")[0],
    armor: byCategory("Defensive"),
    other: pieces.filter((piece) => piece.category === "Enhancer" || piece.category === "Clothing"),
  };

  // --- Missing slots --------------------------------------------------------
  const missingSlots: GearMissingSlot[] = [];
  for (const slot of CORE_WEAPON_SLOTS) {
    if (!loadout[slot.key]) {
      missingSlots.push({
        key: slot.key,
        label: `${slot.label} slot is empty`,
        detail: `Shenzy has nothing equipped in the ${slot.category.toLowerCase()} slot. ${
          slot.key === "temporary"
            ? "Temporary items are situational, but an empty slot is still an unused edge in a fight."
            : "That's a gap worth filling before relying on this loadout in a fight."
        }`,
      });
    }
  }
  if (loadout.armor.length === 0) {
    missingSlots.push({
      key: "armor",
      label: "No armor equipped",
      detail: "Shenzy has no Defensive-slot items equipped at all — every hit lands at full force until that changes.",
    });
  }

  // --- Strongest / weakest / review-recommended -----------------------------
  // Quality is the one numeric axis the API exposes across both weapons and
  // armor, so it's the only defensible single metric for cross-category
  // comparison — we don't invent a combined "power score".
  const qualityRated = pieces.filter(
    (piece) => piece.detailAvailable && typeof piece.stats?.quality === "number",
  ) as (GearPiece & { stats: { quality: number } })[];

  let strongest: GearHighlight | undefined;
  let weakest: GearHighlight | undefined;
  const reviewRecommended: GearHighlight[] = [];

  if (qualityRated.length > 0) {
    const sorted = [...qualityRated].sort((a, b) => b.stats.quality - a.stats.quality);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    strongest = { item: top, reason: `Highest quality rating in the loadout (${top.stats.quality.toFixed(1)}).` };
    if (bottom.uid !== top.uid) {
      weakest = { item: bottom, reason: `Lowest quality rating in the loadout (${bottom.stats.quality.toFixed(1)}).` };
    }

    const averageQuality = qualityRated.reduce((sum, piece) => sum + piece.stats.quality, 0) / qualityRated.length;
    const threshold = averageQuality * REVIEW_RECOMMENDED_RATIO;
    for (const piece of qualityRated) {
      if (piece.stats.quality < threshold) {
        reviewRecommended.push({
          item: piece,
          reason: `Quality (${piece.stats.quality.toFixed(1)}) sits well below Shenzy's loadout average (${averageQuality.toFixed(1)}) — review recommended, not necessarily a replacement.`,
        });
      }
    }
  }

  // --- Headline / summary ----------------------------------------------------
  let headline: string;
  let summary: string;
  if (missingSlots.some((slot) => slot.key === "primary" || slot.key === "secondary" || slot.key === "melee") || missingSlots.some((slot) => slot.key === "armor")) {
    headline = "Gear gaps to close before relying on this loadout";
    summary = `${missingSlots.length} slot${missingSlots.length === 1 ? "" : "s"} need attention — see below for what's missing and what to review.`;
  } else if (reviewRecommended.length > 0) {
    headline = "Loadout looks complete — a few pieces are worth reviewing";
    summary = `Every core slot is filled. ${reviewRecommended.length} piece${reviewRecommended.length === 1 ? "" : "s"} stand${reviewRecommended.length === 1 ? "s" : ""} out as relatively weak within Shenzy's own loadout — worth a look before the next ranked war.`;
  } else if (!bonusDataAvailable) {
    headline = "Loadout looks complete — bonus details unavailable from API";
    summary = "Every core slot is filled and nothing stands out as weak by quality, but Torn isn't returning bonus/stat detail right now, so bonuses can't be evaluated.";
  } else {
    headline = "Loadout looks solid across the board";
    summary = "Every core slot is filled, and nothing in Shenzy's own gear stands out as comparatively weak. Bonus and quality data is available from the API for everything shown below.";
  }

  return {
    headline,
    summary,
    loadout,
    missingSlots,
    strongest,
    weakest,
    reviewRecommended,
    bonusDataAvailable,
    equipmentDataAvailable: true,
    battleStatsTotal,
    battleStatsNote,
  };
}
