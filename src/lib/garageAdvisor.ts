// Pure planning module for the Racing Garage Advisor — mirrors the
// `gearAdvisor.ts`/`warReadiness.ts` pattern: one function takes raw API
// data in, returns a fully-formed plan, shared by the UI and `advisor.ts`.
//
// Core question this answers: "What should Shenzy do next to improve racing
// performance?" — not just "what cars does Shenzy have enlisted?"
//
// IMPORTANT data-availability note (confirmed live before building this):
// `v2/user/enlistedcars` exposes per-car stats, race history, and a `parts`
// array of *opaque numeric IDs* — but the catalog endpoints that would
// resolve those IDs to upgrade names/details (`carupgrades`, `racing/cars`)
// return "access level not high enough" for this key. So upgrade/part
// *details* are genuinely unavailable from the API right now — we say so
// plainly rather than guessing or pulling in community strategy as fact.

import type { TornEnlistedCar } from "./torn-types";

export interface GarageCarStats {
  topSpeed?: number;
  acceleration?: number;
  braking?: number;
  handling?: number;
  safety?: number;
  dirt?: number;
  tarmac?: number;
}

export interface GarageCarSummary {
  id?: number;
  carItemId?: number;
  name: string;
  class?: string;
  worth?: number;
  pointsSpent?: number;
  racesEntered: number;
  racesWon: number;
  /** `undefined` when no races have been entered — there's no rate to report. */
  winRate?: number;
  stats: GarageCarStats;
  partsInstalled: number;
}

export interface GarageWeakArea {
  car: GarageCarSummary;
  statLabel: string;
  statValue: number;
  reason: string;
}

export interface GarageHighlight {
  car: GarageCarSummary;
  reason: string;
}

export interface GarageAdvisorPlan {
  headline: string;
  summary: string;
  garageDataAvailable: boolean;
  /** Always false at this key's current access level — `carupgrades`/`racing/cars` catalog endpoints aren't reachable, so part IDs can't be resolved to names/details. */
  upgradeDataAvailable: boolean;
  cars: GarageCarSummary[];
  classCCars: GarageCarSummary[];
  bestCar?: GarageHighlight;
  weakAreas: GarageWeakArea[];
}

export interface GarageAdvisorInput {
  enlistedcars?: TornEnlistedCar[];
}

const STAT_LABELS: { key: keyof GarageCarStats; label: string }[] = [
  { key: "topSpeed", label: "Top speed" },
  { key: "acceleration", label: "Acceleration" },
  { key: "braking", label: "Braking" },
  { key: "handling", label: "Handling" },
  { key: "safety", label: "Safety" },
  { key: "dirt", label: "Dirt" },
  { key: "tarmac", label: "Tarmac" },
];

// A car's own weakest sub-stat is "comparatively weaker" when it sits well
// below that car's own average across its seven sub-stats — a comparison to
// the car's own profile, not an invented class/level benchmark we don't have.
const WEAK_AREA_RATIO = 0.6;

function toSummary(car: TornEnlistedCar): GarageCarSummary {
  const racesEntered = car.races_entered ?? 0;
  const racesWon = car.races_won ?? 0;
  return {
    id: car.id,
    carItemId: car.car_item_id,
    name: car.car_name || car.car_item_name || "Unknown car",
    class: car.class,
    worth: car.worth,
    pointsSpent: car.points_spent,
    racesEntered,
    racesWon,
    winRate: racesEntered > 0 ? racesWon / racesEntered : undefined,
    stats: {
      topSpeed: car.top_speed,
      acceleration: car.acceleration,
      braking: car.braking,
      handling: car.handling,
      safety: car.safety,
      dirt: car.dirt,
      tarmac: car.tarmac,
    },
    partsInstalled: car.parts?.length ?? 0,
  };
}

function findWeakArea(car: GarageCarSummary): GarageWeakArea | undefined {
  const entries = STAT_LABELS.map(({ key, label }) => ({ label, value: car.stats[key] })).filter(
    (entry): entry is { label: string; value: number } => typeof entry.value === "number",
  );
  if (entries.length < STAT_LABELS.length) return undefined; // only judge when every sub-stat is reported

  const average = entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length;
  const sorted = [...entries].sort((a, b) => a.value - b.value);
  const lowest = sorted[0];
  if (average <= 0 || lowest.value >= average * WEAK_AREA_RATIO) return undefined;

  return {
    car,
    statLabel: lowest.label,
    statValue: lowest.value,
    reason: `${lowest.label} (${lowest.value}) sits well below ${car.name}'s own average sub-stat (${average.toFixed(1)}) — comparatively weaker than the rest of this car's profile, not a claim about what's "good" for its class.`,
  };
}

export function buildGarageAdvisorPlan(input: GarageAdvisorInput): GarageAdvisorPlan {
  const allCars = (input.enlistedcars ?? []).filter((car) => car.is_removed !== true);

  if (allCars.length === 0) {
    return {
      headline: "No racing data available",
      summary: "Torn isn't returning any enlisted cars for Shenzy right now — enlist a car or check back once garage data is available before drawing conclusions.",
      garageDataAvailable: false,
      upgradeDataAvailable: false,
      cars: [],
      classCCars: [],
      weakAreas: [],
    };
  }

  const cars = allCars.map(toSummary);
  const classCCars = cars.filter((car) => (car.class ?? "").toUpperCase() === "C");

  // --- Best car -------------------------------------------------------------
  // Win rate is the one outcome metric the API actually reports — ranking by
  // it (with the sample size stated) is provable from data. We do NOT invent
  // a combined "performance score" across speed/handling/etc.
  const raced = cars.filter((car) => car.racesEntered > 0);
  let bestCar: GarageHighlight | undefined;
  if (raced.length > 0) {
    const sorted = [...raced].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0) || b.racesEntered - a.racesEntered);
    const top = sorted[0];
    bestCar = {
      car: top,
      reason: `Best win-rate car: ${(top.winRate! * 100).toFixed(0)}% (${top.racesWon}/${top.racesEntered} races) — the only outcome metric the API reports, so this reflects race results, not a guess at overall potential.`,
    };
  } else {
    // No race history anywhere — fall back to a stats-based note, clearly
    // labeled as a different (weaker) basis than actual race results.
    const sorted = [...cars].sort((a, b) => {
      const totalA = STAT_LABELS.reduce((sum, { key }) => sum + (a.stats[key] ?? 0), 0);
      const totalB = STAT_LABELS.reduce((sum, { key }) => sum + (b.stats[key] ?? 0), 0);
      return totalB - totalA;
    });
    const top = sorted[0];
    bestCar = {
      car: top,
      reason: `No race history yet to rank by win rate, so this is based on ${top.name}'s combined sub-stats instead — a weaker signal than actual race results, and worth revisiting once races are entered.`,
    };
  }

  // --- Weak areas ------------------------------------------------------------
  // Only surfaced for cars that matter to the question being asked: the best
  // car, and any Class C cars (Shenzy's stated focus) — to avoid noise from
  // cars Shenzy isn't actively racing.
  const candidatesForWeakArea = new Map<number | string, GarageCarSummary>();
  if (bestCar) candidatesForWeakArea.set(bestCar.car.id ?? bestCar.car.name, bestCar.car);
  for (const car of classCCars) candidatesForWeakArea.set(car.id ?? car.name, car);

  const weakAreas: GarageWeakArea[] = [];
  for (const car of candidatesForWeakArea.values()) {
    const weak = findWeakArea(car);
    if (weak) weakAreas.push(weak);
  }

  // --- Headline / summary -----------------------------------------------------
  let headline: string;
  let summary: string;
  if (classCCars.length > 0) {
    headline = `Class C car data available — ${classCCars.length === 1 ? "review handling upgrades" : "review handling and upgrades"}`;
    summary = `Shenzy has ${classCCars.length} Class C car${classCCars.length === 1 ? "" : "s"} enlisted. Garage data is available, but upgrade/part details aren't returned by the API at this key's access level — see the notes below before assuming any specific upgrade is the right move.`;
  } else {
    headline = "Garage data available, but no Class C cars enlisted";
    summary = `Shenzy has ${cars.length} car${cars.length === 1 ? "" : "s"} enlisted, none in Class C. Garage data is available, but upgrade/part details aren't returned by the API at this key's access level.`;
  }

  return {
    headline,
    summary,
    garageDataAvailable: true,
    upgradeDataAvailable: false,
    cars,
    classCCars,
    bestCar,
    weakAreas,
  };
}
