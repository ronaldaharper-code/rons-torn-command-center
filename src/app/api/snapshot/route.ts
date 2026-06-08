import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getTornUserData, mapAdminSummary } from "@/lib/torn";
import { captureSnapshot } from "@/lib/snapshot";
import { prisma } from "@/lib/db";
import { DEFAULT_OWNER_KEY } from "@/lib/owner";
import type { WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

const VALID_CATEGORIES: WatchedItemCategory[] = ["consumable", "energy", "happy", "medical", "other"];

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export async function POST() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getTornUserData().catch(() => null);
  if (!data) {
    return NextResponse.json({ message: "Unable to reach the Torn API right now" }, { status: 502 });
  }

  const summary = mapAdminSummary(data);

  const storedWatchlist = await prisma.itemWatch.findMany({
    where: { ownerKey: DEFAULT_OWNER_KEY },
  });
  const watchlist: WatchedItem[] = storedWatchlist.map((row) => ({
    id: row.id,
    itemName: row.itemName,
    category: VALID_CATEGORIES.includes(row.category as WatchedItemCategory)
      ? (row.category as WatchedItemCategory)
      : "other",
    minTarget: row.minTarget,
    alertEnabled: row.alertEnabled,
  }));

  const payload = await captureSnapshot(summary, data.inventory, watchlist);

  return NextResponse.json({ snapshot: payload }, { status: 201 });
}
