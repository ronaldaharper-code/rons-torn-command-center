// Time utilities shared anywhere Torn-game timing matters (War Readiness,
// cooldowns, travel). Torn City Time (TCT) is simply the game server's clock,
// which runs on UTC — there is no separate "TCT zone" to look up, just UTC
// formatted for display. Local time is rendered with `Intl.DateTimeFormat`
// against an IANA zone name (e.g. "America/Detroit"), which handles DST
// transitions (EST/EDT) automatically — never hardcode an offset.

export const TCT_TIME_ZONE = "UTC";
export const DEFAULT_LOCAL_TIME_ZONE = "America/Detroit";

const TCT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TCT_TIME_ZONE,
});

function localTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

function zoneAbbreviation(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

export interface DualTime {
  tct: string;
  local: string;
}

// Renders a moment in both Torn City Time (UTC) and the given local zone —
// e.g. `{ tct: "23:00 TCT", local: "7:00 PM EDT" }`. The local abbreviation
// (EST vs EDT) is resolved per-instant by `Intl`, so daylight saving is
// handled automatically without us tracking offsets.
export function formatDualTime(timestampMs: number, localTimeZone: string): DualTime {
  const date = new Date(timestampMs);
  return {
    tct: `${TCT_FORMATTER.format(date)} TCT`,
    local: `${localTimeFormatter(localTimeZone).format(date)} ${zoneAbbreviation(date, localTimeZone)}`,
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    return Boolean(new Intl.DateTimeFormat("en-US", { timeZone }));
  } catch {
    return false;
  }
}

// Renders a millisecond duration as a compact "1d 4h 12m" string. Durations
// at or below zero render as "now" — the moment has already arrived/passed.
export function formatDuration(ms: number): string {
  if (ms <= 0) return "now";

  const totalMinutes = Math.round(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}
