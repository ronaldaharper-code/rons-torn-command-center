import { prisma } from "./db";
import { DEFAULT_OWNER_KEY } from "./owner";
import { inventoryQuantity } from "./torn";
import type {
  AdminSummary,
  ConsumableUsageEstimate,
  SnapshotPayload,
  TornItemInventory,
  WatchedItem,
} from "./torn-types";

// Snapshots are simple point-in-time captures of a player's stats and watched
// inventory. They're stored generically in the Snapshot table as
// `{ type: "stat-snapshot", data: JSON.stringify(SnapshotPayload) }` so the
// same model can host other snapshot kinds later without a schema change.
//
// What snapshots unlock once enough history accumulates:
// - Net worth trend: chart `netWorth`/`cash`/`bank` across captures over time.
// - Stat growth: compare `battleStatsTotal` between captures to show training pace.
// - Consumable burn rate: diff `watchedInventory[item]` across captures to estimate
//   daily usage (see `estimateConsumableUsage` below) and warn before items run out.
// - Inventory days remaining: combine burn rate with current quantity.
// - Advisor recommendations: `snapshotTrendRecommendations` in advisor.ts can compare
//   the latest snapshot against older ones (e.g. "net worth dropped 20% this week").
const SNAPSHOT_TYPE = "stat-snapshot";

export function buildSnapshotPayload(
  summary: AdminSummary,
  inventory: TornItemInventory | undefined,
  watchlist: WatchedItem[],
): SnapshotPayload {
  const watchedInventory: Record<string, number> = {};
  for (const watched of watchlist) {
    watchedInventory[watched.itemName] = inventoryQuantity(inventory, watched.itemName);
  }

  return {
    capturedAt: new Date().toISOString(),
    netWorth: summary.financial.total,
    cash: summary.financial.cash,
    bank: summary.financial.bank,
    points: summary.character.points,
    merits: summary.character.merits,
    energy: summary.character.energy,
    happy: summary.character.happy,
    nerve: summary.character.nerve,
    watchedInventory,
  };
}

export async function captureSnapshot(
  summary: AdminSummary,
  inventory: TornItemInventory | undefined,
  watchlist: WatchedItem[],
): Promise<SnapshotPayload> {
  const payload = buildSnapshotPayload(summary, inventory, watchlist);

  await prisma.snapshot.create({
    data: {
      ownerKey: DEFAULT_OWNER_KEY,
      type: SNAPSHOT_TYPE,
      data: JSON.stringify(payload),
    },
  });

  return payload;
}

export async function getRecentSnapshots(limit = 30): Promise<SnapshotPayload[]> {
  const rows = await prisma.snapshot.findMany({
    where: { ownerKey: DEFAULT_OWNER_KEY, type: SNAPSHOT_TYPE },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const payloads: SnapshotPayload[] = [];
  for (const row of rows) {
    try {
      payloads.push(JSON.parse(row.data) as SnapshotPayload);
    } catch {
      // Skip malformed rows rather than failing the whole read.
    }
  }
  return payloads;
}

const MIN_SNAPSHOTS_FOR_ESTIMATE = 2;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function dailyUsageOverWindow(snapshots: SnapshotPayload[], itemName: string, windowMs: number): number | undefined {
  const now = Date.now();
  const inWindow = snapshots.filter((snap) => now - new Date(snap.capturedAt).getTime() <= windowMs);
  if (inWindow.length < MIN_SNAPSHOTS_FOR_ESTIMATE) return undefined;

  // Snapshots are ordered newest-first; the oldest entry within the window is the baseline.
  const newest = inWindow[0];
  const oldest = inWindow[inWindow.length - 1];

  const elapsedDays = (new Date(newest.capturedAt).getTime() - new Date(oldest.capturedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (elapsedDays <= 0) return undefined;

  const consumed = (oldest.watchedInventory[itemName] ?? 0) - (newest.watchedInventory[itemName] ?? 0);
  if (consumed <= 0) return 0;

  return consumed / elapsedDays;
}

// Walks recent snapshots (newest-first) to estimate how fast each watched item
// is being consumed, comparing the oldest snapshot inside a 7-day and 30-day
// window against the newest. Returns a placeholder ("not enough history yet")
// for items where fewer than two snapshots fall inside either window.
export function estimateConsumableUsage(watchlist: WatchedItem[], snapshots: SnapshotPayload[]): ConsumableUsageEstimate[] {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );
  const latest = sorted[0];

  return watchlist.map((watched) => {
    const currentQuantity = latest?.watchedInventory[watched.itemName] ?? 0;
    const dailyUsage7d = dailyUsageOverWindow(sorted, watched.itemName, SEVEN_DAYS_MS);
    const dailyUsage30d = dailyUsageOverWindow(sorted, watched.itemName, THIRTY_DAYS_MS);
    const hasEnoughHistory = dailyUsage7d !== undefined || dailyUsage30d !== undefined;

    const usageForEstimate = dailyUsage7d || dailyUsage30d;
    const daysRemaining = usageForEstimate && usageForEstimate > 0 ? currentQuantity / usageForEstimate : undefined;

    return {
      itemName: watched.itemName,
      currentQuantity,
      dailyUsage7d,
      dailyUsage30d,
      daysRemaining,
      hasEnoughHistory,
    };
  });
}
