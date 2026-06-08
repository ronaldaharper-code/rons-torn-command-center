import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { WatchedItem, WatchedItemCategory } from "@/lib/torn-types";

const VALID_CATEGORIES: WatchedItemCategory[] = ["consumable", "energy", "happy", "medical", "other"];

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

function toWatchedItem(row: { id: number; itemName: string; category: string; minTarget: number; alertEnabled: boolean }): WatchedItem {
  const category = VALID_CATEGORIES.includes(row.category as WatchedItemCategory)
    ? (row.category as WatchedItemCategory)
    : "other";
  return {
    id: row.id,
    itemName: row.itemName,
    category,
    minTarget: row.minTarget,
    alertEnabled: row.alertEnabled,
  };
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.itemWatch.findMany({ orderBy: { itemName: "asc" } });
  return NextResponse.json({ items: items.map(toWatchedItem) });
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const itemName = typeof body?.itemName === "string" ? body.itemName.trim() : "";
  const category = VALID_CATEGORIES.includes(body?.category) ? (body.category as WatchedItemCategory) : "other";
  const minTarget = Number.isFinite(Number(body?.minTarget)) ? Math.max(0, Number(body.minTarget)) : 0;
  const alertEnabled = Boolean(body?.alertEnabled ?? true);

  if (!itemName) {
    return NextResponse.json({ message: "itemName is required" }, { status: 400 });
  }

  const existing = await prisma.itemWatch.findUnique({ where: { itemName } });
  if (existing) {
    return NextResponse.json({ message: "This item is already on the watchlist" }, { status: 409 });
  }

  const created = await prisma.itemWatch.create({
    data: { itemName, category, minTarget, alertEnabled },
  });

  return NextResponse.json({ item: toWatchedItem(created) }, { status: 201 });
}
