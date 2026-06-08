// Pure planning module for the Property Advisor — mirrors garageAdvisor.ts /
// gearAdvisor.ts: one function takes raw API data + settings in, returns a
// fully-formed plan, shared between the UI and advisor.ts so their verdicts
// can never disagree.
//
// Core question this answers: "What should Shenzy do next with properties
// and rentals?" — not just "what properties does Shenzy own?"

import type { ManualRentalReminder } from "./settings";
import type { TornPropertyV2 } from "./torn-types";

export interface PropertyRentalInfo {
  renterName?: string;
  costPerDay?: number;
  rentalPeriodDays?: number;
  /** Exact days remaining as reported live by the API — undefined when Torn doesn't expose it for this property. */
  daysRemaining?: number;
  extensionOffered: boolean;
  extensionCostPerPeriod?: number;
}

export interface PropertySummary {
  id?: number;
  name: string;
  status: string;
  ownedByCharacter: boolean;
  happy?: number;
  upkeep?: number;
  staffUpkeep?: number;
  marketValue?: number;
  modificationsCount: number;
  rental?: PropertyRentalInfo;
}

export type RentalUrgency = "urgent" | "offer-now" | "upcoming";

export interface RentalAlert {
  property: PropertySummary;
  urgency: RentalUrgency;
  daysRemaining: number;
  reason: string;
}

export type ManualReminderUrgency = "overdue" | "urgent" | "offer-now" | "upcoming";

export interface ManualReminderAlert {
  reminder: ManualRentalReminder;
  daysRemaining: number;
  urgency: ManualReminderUrgency;
  reason: string;
}

export interface PropertyAdvisorPlan {
  headline: string;
  summary: string;
  propertyDataAvailable: boolean;
  /** True only when at least one of Shenzy's rented properties reports `daysRemaining` from the API. */
  rentalTimingAvailable: boolean;
  properties: PropertySummary[];
  ownedProperties: PropertySummary[];
  rentedProperties: PropertySummary[];
  rentalAlerts: RentalAlert[];
  manualReminderAlerts: ManualReminderAlert[];
  extensionReminderDays: number;
  urgentReminderDays: number;
  hasManualReminders: boolean;
}

export interface PropertyAdvisorInput {
  properties?: TornPropertyV2[];
  characterId?: number;
  extensionReminderDays?: number;
  urgentReminderDays?: number;
  manualRentalReminders?: ManualRentalReminder[];
  /** Injectable for deterministic output; defaults to `new Date()`. */
  now?: Date;
}

const DEFAULT_EXTENSION_REMINDER_DAYS = 10;
const DEFAULT_URGENT_REMINDER_DAYS = 5;

// How far beyond the extension-offer threshold to surface an "opens in N
// days" heads-up — beyond this window, a rental isn't yet relevant to flag.
const UPCOMING_LOOKAHEAD_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toSummary(property: TornPropertyV2, characterId?: number): PropertySummary {
  const name = property.property?.name || "Unknown property";
  const status = property.status || "unknown";
  const ownedByCharacter = characterId !== undefined && property.owner?.id === characterId;

  const rental: PropertyRentalInfo | undefined =
    status === "rented"
      ? {
          renterName: property.rented_by?.name,
          costPerDay: property.cost_per_day,
          rentalPeriodDays: property.rental_period,
          daysRemaining: property.rental_period_remaining,
          extensionOffered: Boolean(property.lease_extension),
          extensionCostPerPeriod: property.lease_extension?.cost,
        }
      : undefined;

  return {
    id: property.id,
    name,
    status,
    ownedByCharacter,
    happy: property.happy,
    upkeep: property.upkeep?.property,
    staffUpkeep: property.upkeep?.staff,
    marketValue: property.market_price,
    modificationsCount: Array.isArray(property.modifications) ? property.modifications.length : 0,
    rental,
  };
}

// Translates days-remaining into the user's stated preference: offer an
// extension at 10 days, treat under 5 as urgent, and give a heads-up shortly
// before the offer window opens. Only produced when the API actually reports
// `daysRemaining` — otherwise we say so plainly rather than guess.
function rentalAlertFor(property: PropertySummary, extensionDays: number, urgentDays: number): RentalAlert | undefined {
  const rental = property.rental;
  if (!rental || rental.daysRemaining === undefined) return undefined;

  const daysRemaining = rental.daysRemaining;
  const renterLabel = rental.renterName ? ` (renter: ${rental.renterName})` : "";
  const dayWord = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

  if (daysRemaining <= urgentDays) {
    return {
      property,
      urgency: "urgent",
      daysRemaining,
      reason: `${property.name}${renterLabel} has ${dayWord(daysRemaining)} left on its rental — urgent, under the ${urgentDays}-day threshold.`,
    };
  }

  if (daysRemaining <= extensionDays) {
    const queuedNote = rental.extensionOffered
      ? " An extension offer is already queued for this property."
      : "";
    return {
      property,
      urgency: "offer-now",
      daysRemaining,
      reason: `${property.name}${renterLabel} has ${dayWord(daysRemaining)} remaining — at or below Shenzy's ${extensionDays}-day extension-offer threshold.${queuedNote}`,
    };
  }

  if (daysRemaining <= extensionDays + UPCOMING_LOOKAHEAD_DAYS) {
    const opensIn = daysRemaining - extensionDays;
    return {
      property,
      urgency: "upcoming",
      daysRemaining,
      reason: `${property.name}${renterLabel} has ${dayWord(daysRemaining)} remaining — the extension-offer window opens in ${dayWord(opensIn)}.`,
    };
  }

  return undefined;
}

// Manual reminders are a fallback for whatever the live API doesn't cover —
// they store an end date (not a "days remaining" snapshot, which would go
// stale), and we compute days-remaining from it the same way each render.
function manualReminderAlertFor(
  reminder: ManualRentalReminder,
  urgentDays: number,
  extensionDays: number,
  now: Date,
): ManualReminderAlert | undefined {
  const end = new Date(`${reminder.rentalEndDate}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return undefined;

  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
  const dayWord = (n: number) => `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"}`;

  let urgency: ManualReminderUrgency;
  let reason: string;
  if (daysRemaining < 0) {
    urgency = "overdue";
    reason = `${reminder.propertyLabel} — manual reminder end date passed ${dayWord(daysRemaining)} ago. Confirm whether this rental was already handled, then update or remove the reminder.`;
  } else if (daysRemaining <= urgentDays) {
    urgency = "urgent";
    reason = `${reminder.propertyLabel} — manual reminder shows ${dayWord(daysRemaining)} remaining. Urgent, under the ${urgentDays}-day threshold.`;
  } else if (daysRemaining <= extensionDays) {
    urgency = "offer-now";
    reason = `${reminder.propertyLabel} — manual reminder shows ${dayWord(daysRemaining)} remaining. At or below the ${extensionDays}-day extension-offer threshold.`;
  } else {
    urgency = "upcoming";
    reason = `${reminder.propertyLabel} — manual reminder shows ${dayWord(daysRemaining)} remaining. No action needed yet.`;
  }

  return { reminder, daysRemaining, urgency, reason };
}

export function buildPropertyAdvisorPlan(input: PropertyAdvisorInput): PropertyAdvisorPlan {
  const rawProperties = input.properties ?? [];
  const extensionReminderDays = input.extensionReminderDays ?? DEFAULT_EXTENSION_REMINDER_DAYS;
  const urgentReminderDays = input.urgentReminderDays ?? DEFAULT_URGENT_REMINDER_DAYS;
  const manualReminders = input.manualRentalReminders ?? [];
  const now = input.now ?? new Date();

  const properties = rawProperties.map((property) => toSummary(property, input.characterId));
  const ownedProperties = properties.filter((property) => property.ownedByCharacter);
  const rentedProperties = ownedProperties.filter((property) => property.status === "rented");

  const propertyDataAvailable = rawProperties.length > 0;
  const rentalTimingAvailable = rentedProperties.some((property) => property.rental?.daysRemaining !== undefined);

  const rentalAlerts = rentedProperties
    .map((property) => rentalAlertFor(property, extensionReminderDays, urgentReminderDays))
    .filter((alert): alert is RentalAlert => Boolean(alert))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const manualReminderAlerts = manualReminders
    .map((reminder) => manualReminderAlertFor(reminder, urgentReminderDays, extensionReminderDays, now))
    .filter((alert): alert is ManualReminderAlert => Boolean(alert))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  let headline: string;
  let summary: string;
  const propertyWord = (n: number) => `propert${n === 1 ? "y" : "ies"}`;

  if (!propertyDataAvailable) {
    headline = "No property data available";
    summary = "Torn isn't returning any property data for this key right now — own or rent a property to see guidance here.";
  } else if (ownedProperties.length === 0) {
    headline = "No properties owned directly";
    summary = `Torn reports ${rawProperties.length} ${propertyWord(rawProperties.length)} linked to Shenzy's account, but none are owned by Shenzy directly (e.g. a spouse's properties) — nothing to manage here yet.`;
  } else {
    const urgentCount = rentalAlerts.filter((alert) => alert.urgency === "urgent").length;
    const offerNowCount = rentalAlerts.filter((alert) => alert.urgency === "offer-now").length;
    const baseInfo = `Shenzy owns ${ownedProperties.length} ${propertyWord(ownedProperties.length)}, ${rentedProperties.length} currently rented out.`;

    if (urgentCount > 0) {
      headline = `${urgentCount} rental${urgentCount === 1 ? "" : "s"} urgent — under ${urgentReminderDays} days remaining`;
      summary = `${baseInfo} ${urgentCount} need${urgentCount === 1 ? "s" : ""} attention now.`;
    } else if (offerNowCount > 0) {
      headline = `${offerNowCount} rental${offerNowCount === 1 ? "" : "s"} ready for an extension offer`;
      summary = `${baseInfo} ${offerNowCount} ${offerNowCount === 1 ? "is" : "are"} at or below the ${extensionReminderDays}-day extension-offer threshold.`;
    } else if (rentedProperties.length > 0) {
      headline = "Rentals on track";
      summary = `${baseInfo} None need an extension offer yet based on live rental timing.`;
    } else {
      headline = "Properties owned, none currently rented";
      summary = `Shenzy owns ${ownedProperties.length} ${propertyWord(ownedProperties.length)}. None are currently rented out.`;
    }
  }

  return {
    headline,
    summary,
    propertyDataAvailable,
    rentalTimingAvailable,
    properties,
    ownedProperties,
    rentedProperties,
    rentalAlerts,
    manualReminderAlerts,
    extensionReminderDays,
    urgentReminderDays,
    hasManualReminders: manualReminders.length > 0,
  };
}
