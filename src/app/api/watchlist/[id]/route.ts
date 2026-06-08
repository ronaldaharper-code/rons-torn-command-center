import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { DEFAULT_OWNER_KEY } from "@/lib/owner";
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.itemWatch.findUnique({ where: { id } });
  if (!existing || existing.ownerKey !== DEFAULT_OWNER_KEY) {
    return NextResponse.json({ message: "Watched item not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const data: { category?: WatchedItemCategory; minTarget?: number; alertEnabled?: boolean } = {};

  if (body?.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json({ message: "Invalid category" }, { status: 400 });
    }
    data.category = body.category;
  }

  if (body?.minTarget !== undefined) {
    const minTarget = Number(body.minTarget);
    if (!Number.isFinite(minTarget) || minTarget < 0) {
      return NextResponse.json({ message: "minTarget must be a non-negative number" }, { status: 400 });
    }
    data.minTarget = Math.trunc(minTarget);
  }

  if (body?.alertEnabled !== undefined) {
    data.alertEnabled = Boolean(body.alertEnabled);
  }

  const updated = await prisma.itemWatch.update({ where: { id }, data });
  return NextResponse.json({ item: toWatchedItem(updated) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.itemWatch.findUnique({ where: { id } });
  if (!existing || existing.ownerKey !== DEFAULT_OWNER_KEY) {
    return NextResponse.json({ message: "Watched item not found" }, { status: 404 });
  }

  await prisma.itemWatch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
