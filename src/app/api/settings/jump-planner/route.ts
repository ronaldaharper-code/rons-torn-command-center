import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setJumpTrainingFocus, setEdcBenefitAvailable } from "@/lib/settings";
import type { JumpStatKey } from "@/lib/settings";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

const VALID_STATS: JumpStatKey[] = ["strength", "defense", "speed", "dexterity"];

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if ("trainingFocusStats" in body) {
    const raw = body.trainingFocusStats;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { message: "trainingFocusStats must be a non-empty array of stat names" },
        { status: 400 },
      );
    }
    const stats = raw.filter((s): s is JumpStatKey => VALID_STATS.includes(s as JumpStatKey));
    if (stats.length === 0) {
      return NextResponse.json(
        { message: "No valid stat names provided. Valid values: strength, defense, speed, dexterity" },
        { status: 400 },
      );
    }
    await setJumpTrainingFocus(stats);
  }

  if ("edcBenefitAvailable" in body) {
    if (typeof body.edcBenefitAvailable !== "boolean") {
      return NextResponse.json({ message: "edcBenefitAvailable must be a boolean" }, { status: 400 });
    }
    await setEdcBenefitAvailable(body.edcBenefitAvailable);
  }

  return NextResponse.json({ message: "Settings updated" });
}
