import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
  }

  for (const item of body) {
    if (typeof item?.itemName !== "string") continue;
    const itemName = item.itemName.trim();
    const minTarget = Number(item.minTarget ?? 0);
    const alertEnabled = Boolean(item.alertEnabled ?? true);

    await prisma.itemWatch.upsert({
      where: { itemName },
      update: { minTarget, alertEnabled },
      create: { itemName, minTarget, alertEnabled },
    });
  }

  return NextResponse.json({ success: true });
}
