import { inventoryQuantity } from "./torn";
import { formatDualTime, formatDuration } from "./time";
import type { CharacterOverview, CooldownEntry, TornCooldowns, TornItemInventory } from "./torn-types";

// War Readiness answers one question: "will Shenzy be ready when ranked war
// starts?" It's deliberately time-aware rather than a generic checklist —
// everything here is framed against a war start time (from the API or a
// manual Settings value) so guidance changes as that countdown moves.
//
// Be conservative throughout: when we can't determine a clear time for
// something (e.g. travel arrival isn't in the data we have), we say
// "unknown" rather than assume it resolves in time.

export type ReadyByWarStart = boolean | "unknown";

export interface WarReadinessBlockingIssue {
  key: string;
  label: string;
  detail: string;
  severity: "critical" | "high" | "medium";
  /** Unix ms when this is expected to clear — undefined means "can't tell from available data". */
  resolvesAt?: number;
}

export interface WarReadinessAction {
  key: string;
  label: string;
  detail: string;
}

export type VicodinVerdict =
  | "take-now"
  | "wait-for-cooldown"
  | "hold-until-closer"
  | "save-for-war-start"
  | "no-vicodin"
  | "unknown";

export interface VicodinTimingGuidance {
  verdict: VicodinVerdict;
  headline: string;
  detail: string;
  assumptionMinutes: number;
}

export type WarTimeSource = "api" | "manual" | "none";

export interface WarTimeInfo {
  startMs?: number;
  source: WarTimeSource;
  tct?: string;
  local?: string;
  timeUntil?: string;
}

export interface WarReadinessPlan {
  score: number;
  readyNow: boolean;
  readyByWarStart: ReadyByWarStart;
  warTime: WarTimeInfo;
  headline: string;
  summary: string;
  blockingIssues: WarReadinessBlockingIssue[];
  recommendedActions: WarReadinessAction[];
  vicodinGuidance: VicodinTimingGuidance;
}

export interface WarReadinessInput {
  character: CharacterOverview;
  cooldowns?: TornCooldowns;
  cooldownOverview?: CooldownEntry[];
  inventory?: TornItemInventory;
  rankedWarStartMs?: number;
  rankedWarSource: WarTimeSource;
  preferredTimeZone: string;
  vicodinCooldownAssumptionMinutes: number;
  /** Injectable for tests; defaults to `Date.now()`. */
  now?: number;
}

const STATUS_PENALTY: Record<CharacterOverview["status"], number> = {
  okay: 0,
  traveling: 25,
  hospital: 50,
  jail: 40,
  unknown: 15,
};

const COMFORTABLE_VICODIN_BUFFER_MS = 30 * 60 * 1000;

function buildVicodinGuidance(args: {
  now: number;
  warStartMs?: number;
  medicalCooldownSeconds: number;
  vicodinCount: number;
  assumptionMinutes: number;
  preferredTimeZone: string;
}): VicodinTimingGuidance {
  const { now, warStartMs, medicalCooldownSeconds, vicodinCount, assumptionMinutes, preferredTimeZone } = args;
  const assumptionMs = assumptionMinutes * 60_000;
  const dual = (ms: number) => formatDualTime(ms, preferredTimeZone);

  if (vicodinCount === 0) {
    return {
      verdict: "no-vicodin",
      headline: "No Vicodin on hand",
      detail: "Pick some up before war so you have a healing option ready when the cooldown math works in your favor.",
      assumptionMinutes,
    };
  }

  if (warStartMs === undefined) {
    return {
      verdict: "unknown",
      headline: "Set a ranked war start time for Vicodin timing guidance",
      detail: `We assume Vicodin keeps your medical cooldown busy for about ${formatDuration(assumptionMs)} (configurable in Settings — Torn doesn't expose this directly), but without a war start time we can't say whether to take it now or hold it.`,
      assumptionMinutes,
    };
  }

  const timeUntilWar = warStartMs - now;
  const cooldownClearsAt = now + medicalCooldownSeconds * 1000;

  if (timeUntilWar <= 0) {
    return {
      verdict: "save-for-war-start",
      headline: "War has started — use Vicodin reactively as needed",
      detail: "The countdown has elapsed. Use Vicodin to respond to medical needs in the fight rather than pre-planning around cooldowns now.",
      assumptionMinutes,
    };
  }

  // A cooldown is already running — taking Vicodin right now isn't an option;
  // the only question is whether the *current* cooldown clears in time.
  if (medicalCooldownSeconds > 0) {
    if (cooldownClearsAt <= warStartMs) {
      const clearedDual = dual(cooldownClearsAt);
      return {
        verdict: "wait-for-cooldown",
        headline: "Medical cooldown clears before war — no action needed yet",
        detail: `Your current medical cooldown clears around ${clearedDual.local} (${clearedDual.tct}), which is before war starts. Re-check once it's clear to decide on Vicodin timing then.`,
        assumptionMinutes,
      };
    }
    return {
      verdict: "save-for-war-start",
      headline: "Medical cooldown won't clear before war — hold your Vicodin",
      detail: "Your current medical cooldown is still running and is expected to still be active when war begins. Save your Vicodin and use it once the fight starts instead of trying to time it beforehand.",
      assumptionMinutes,
    };
  }

  // Cooldown is clear right now — the only variable is whether taking
  // Vicodin *now* would still clear comfortably before (or at) war start.
  const projectedClearIfTakenNow = now + assumptionMs;
  const projectedDual = dual(projectedClearIfTakenNow);
  const warDual = dual(warStartMs);

  if (projectedClearIfTakenNow + COMFORTABLE_VICODIN_BUFFER_MS <= warStartMs) {
    return {
      verdict: "take-now",
      headline: `Take Vicodin now — cooldown should clear well before war (in ${formatDuration(timeUntilWar)})`,
      detail: `Based on a ${formatDuration(assumptionMs)} cooldown assumption (configurable in Settings), taking it now would clear around ${projectedDual.local} (${projectedDual.tct}) — comfortably before war starts at ${warDual.local} (${warDual.tct}). You get the benefit now without losing flexibility at war start.`,
      assumptionMinutes,
    };
  }

  if (projectedClearIfTakenNow > warStartMs) {
    return {
      verdict: "save-for-war-start",
      headline: `Don't take Vicodin now — war starts in ${formatDuration(timeUntilWar)} and cooldown would still be active`,
      detail: `Based on a ${formatDuration(assumptionMs)} cooldown assumption (configurable in Settings), taking it now would keep your medical cooldown busy until around ${projectedDual.local} — past war start at ${warDual.local}. Save it so your cooldown is clear and flexible when the fight begins.`,
      assumptionMinutes,
    };
  }

  return {
    verdict: "hold-until-closer",
    headline: `Hold off a little longer — war starts in ${formatDuration(timeUntilWar)}`,
    detail: `Taking it now would clear close to war start with little buffer (around ${projectedDual.local}, assuming a ${formatDuration(assumptionMs)} cooldown). Waiting preserves more flexibility — re-check this guidance as war start gets closer.`,
    assumptionMinutes,
  };
}

export function buildWarReadinessPlan(input: WarReadinessInput): WarReadinessPlan {
  const now = input.now ?? Date.now();
  const { character, cooldowns, cooldownOverview, inventory, preferredTimeZone } = input;
  const { status, life, energy } = character;

  const xanaxCount = inventoryQuantity(inventory, "Xanax");
  const vicodinCount = inventoryQuantity(inventory, "Vicodin");
  const filledBloodBags = inventoryQuantity(inventory, "Filled Blood Bag");
  const emptyBloodBags = inventoryQuantity(inventory, "Empty Blood Bag");
  const totalBloodBags = filledBloodBags + emptyBloodBags;

  const lifeRatio = life.maximum > 0 ? life.current / life.maximum : 1;
  const energyRatio = energy.maximum > 0 ? energy.current / energy.maximum : 0;

  // --- Score (0-100) -----------------------------------------------------
  // Each factor is capped so no single input can fully sink or carry the
  // score alone — a deliberately conservative blend of "can you fight right
  // now" (status, life, energy) and "are you stocked for the fight"
  // (blood bags, Xanax, Vicodin).
  let score = 100;
  score -= STATUS_PENALTY[status] ?? 15;
  if (lifeRatio < 0.25) score -= 25;
  else if (lifeRatio < 0.5) score -= 15;
  else if (lifeRatio < 0.75) score -= 5;
  if (energyRatio < 0.2) score -= 10;
  else if (energyRatio < 0.5) score -= 5;
  if (totalBloodBags === 0) score -= 10;
  if (xanaxCount === 0) score -= 5;
  if (vicodinCount === 0) score -= 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // --- Blocking issues ----------------------------------------------------
  const blockingIssues: WarReadinessBlockingIssue[] = [];

  if (status === "hospital") {
    const resolvesAt = character.hospitalUntil ? character.hospitalUntil * 1000 : undefined;
    blockingIssues.push({
      key: "hospital",
      label: "In hospital",
      detail: resolvesAt
        ? `Discharged around ${formatDualTime(resolvesAt, preferredTimeZone).local} (${formatDualTime(resolvesAt, preferredTimeZone).tct}).`
        : "Can't fight until you're discharged, and the API isn't reporting a release time right now — treat this as an unknown-duration blocker.",
      severity: "critical",
      resolvesAt,
    });
  } else if (status === "jail") {
    const resolvesAt = character.jailUntil ? character.jailUntil * 1000 : undefined;
    blockingIssues.push({
      key: "jail",
      label: "In jail",
      detail: resolvesAt
        ? `Released around ${formatDualTime(resolvesAt, preferredTimeZone).local} (${formatDualTime(resolvesAt, preferredTimeZone).tct}).`
        : "Can't fight until you're released, and the API isn't reporting a release time right now — treat this as an unknown-duration blocker.",
      severity: "critical",
      resolvesAt,
    });
  } else if (status === "traveling") {
    blockingIssues.push({
      key: "traveling",
      label: "Currently traveling",
      detail: "You can't take part in a faction war while abroad. Arrival time isn't available from the data we have, so we can't confirm you'll be back before war starts.",
      severity: "high",
      resolvesAt: undefined,
    });
  }

  if (lifeRatio < 0.5) {
    blockingIssues.push({
      key: "low-life",
      label: "Life is low",
      detail: `${life.current}/${life.maximum} life — risky to engage in a fight at this level without healing first.`,
      severity: lifeRatio < 0.25 ? "critical" : "high",
      resolvesAt: undefined,
    });
  }

  if (totalBloodBags === 0) {
    blockingIssues.push({
      key: "no-blood-bags",
      label: "No blood bags on hand",
      detail: "Blood bags matter most for war revives and emergency healing — your inventory currently has none.",
      severity: "medium",
      resolvesAt: undefined,
    });
  }

  // --- Recommended actions -------------------------------------------------
  const recommendedActions: WarReadinessAction[] = [];

  if (status === "traveling") {
    recommendedActions.push({
      key: "return-from-travel",
      label: "Return from travel",
      detail: "Head back to Torn — you can't fight in a faction war while you're abroad.",
    });
  }
  if (vicodinCount === 0) {
    recommendedActions.push({
      key: "buy-vicodin",
      label: "Buy Vicodin",
      detail: "Add Vicodin to your inventory so you have a healing option lined up before the fight.",
    });
  }
  if (totalBloodBags === 0) {
    recommendedActions.push({
      key: "buy-blood-bags",
      label: "Buy blood bags",
      detail: "Stock Filled and/or Empty Blood Bags — they're the standard tool for war revives and emergency healing.",
    });
  }
  if (xanaxCount === 0) {
    recommendedActions.push({
      key: "buy-xanax",
      label: "Buy Xanax",
      detail: "Pick up Xanax so you can refill energy mid-fight if your drug cooldown allows it.",
    });
  } else {
    const drug = cooldownOverview?.find((entry) => entry.key === "drug");
    if (drug?.state === "waiting") {
      recommendedActions.push({
        key: "save-xanax",
        label: "Save your Xanax",
        detail: `Your drug cooldown is still running${drug.detail ? ` (${drug.detail})` : ""} — using a Xanax now would be wasted. Hold it for when the cooldown clears or for war start.`,
      });
    }
  }

  // --- War time -----------------------------------------------------------
  let warTime: WarTimeInfo;
  if (input.rankedWarStartMs !== undefined) {
    const dual = formatDualTime(input.rankedWarStartMs, preferredTimeZone);
    warTime = {
      startMs: input.rankedWarStartMs,
      source: input.rankedWarSource,
      tct: dual.tct,
      local: dual.local,
      timeUntil: formatDuration(input.rankedWarStartMs - now),
    };
  } else {
    warTime = { source: "none" };
  }

  // --- readyNow / readyByWarStart ------------------------------------------
  const hasCriticalBlocker = blockingIssues.some((issue) => issue.severity === "critical");
  const readyNow = !hasCriticalBlocker && status === "okay" && lifeRatio >= 0.5;

  let readyByWarStart: ReadyByWarStart;
  if (warTime.startMs === undefined) {
    readyByWarStart = "unknown";
  } else if (blockingIssues.length === 0) {
    readyByWarStart = true;
  } else {
    const hasUnknownTimedBlocker = blockingIssues.some((issue) => issue.resolvesAt === undefined);
    if (hasUnknownTimedBlocker) {
      readyByWarStart = "unknown";
    } else {
      readyByWarStart = blockingIssues.every((issue) => (issue.resolvesAt ?? 0) <= warTime.startMs!);
    }
  }

  // --- Vicodin guidance -----------------------------------------------------
  const vicodinGuidance = buildVicodinGuidance({
    now,
    warStartMs: warTime.startMs,
    medicalCooldownSeconds: cooldowns?.medical ?? 0,
    vicodinCount,
    assumptionMinutes: input.vicodinCooldownAssumptionMinutes,
    preferredTimeZone,
  });

  // --- Headline / summary ---------------------------------------------------
  let headline: string;
  let summary: string;

  if (warTime.startMs === undefined) {
    headline = "Set a ranked war start time to unlock the countdown";
    summary = "Torn isn't reporting a scheduled ranked war for your faction right now, and no manual start time is set. Add one in Settings to get a live countdown, readiness forecast, and Vicodin timing guidance.";
  } else if (readyNow && readyByWarStart === true) {
    headline = `On track — ready now, war starts in ${warTime.timeUntil}`;
    summary = `Readiness score is ${score}/100. Nothing currently blocks you from fighting, and there's nothing outstanding that would still be a problem at war start.`;
  } else if (readyNow && readyByWarStart === "unknown") {
    headline = `Ready right now — war starts in ${warTime.timeUntil}, but some timing is uncertain`;
    summary = `You're in fighting shape today (score ${score}/100). We can't fully confirm everything holds until war start though — see the notes below before assuming you're set.`;
  } else if (!readyNow && readyByWarStart === true) {
    headline = `Not ready yet, but on track to clear before war starts in ${warTime.timeUntil}`;
    summary = `Score is ${score}/100 right now. Based on known timers, the issues below are expected to resolve before war begins — but keep an eye on them.`;
  } else if (readyByWarStart === false) {
    headline = `Not on track — something won't clear before war starts in ${warTime.timeUntil}`;
    summary = `Score is ${score}/100. At least one blocking issue is expected to still be active when war begins. Acting now is the only way to change that outcome.`;
  } else {
    headline = `Not war ready — war starts in ${warTime.timeUntil}`;
    summary = `Score is ${score}/100, and we can't confirm the current issues clear before war start. Treat this as "not ready" until the picture is clearer — better to over-prepare than assume it'll sort itself out.`;
  }

  return {
    score,
    readyNow,
    readyByWarStart,
    warTime,
    headline,
    summary,
    blockingIssues,
    recommendedActions,
    vicodinGuidance,
  };
}
