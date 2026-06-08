import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setWarReadinessSetting } from "@/lib/settings";
import { isValidTimeZone } from "@/lib/time";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if ("preferredTimeZone" in body) {
    const value = body.preferredTimeZone;
    if (typeof value !== "string" || !isValidTimeZone(value.trim())) {
      return NextResponse.json({ message: `"${value}" isn't a recognized time zone (e.g. America/Detroit)` }, { status: 400 });
    }
    await setWarReadinessSetting("preferredTimeZone", value.trim());
  }

  if ("manualRankedWarStart" in body) {
    const value = body.manualRankedWarStart;
    if (value === null || value === "") {
      await setWarReadinessSetting("manualRankedWarStart", null);
    } else if (typeof value === "string") {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ message: "Invalid ranked war start time" }, { status: 400 });
      }
      await setWarReadinessSetting("manualRankedWarStart", date.toISOString());
    } else {
      return NextResponse.json({ message: "Invalid ranked war start time" }, { status: 400 });
    }
  }

  if ("vicodinCooldownAssumptionMinutes" in body) {
    const value = Number(body.vicodinCooldownAssumptionMinutes);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ message: "Vicodin cooldown assumption must be a positive number of minutes" }, { status: 400 });
    }
    await setWarReadinessSetting("vicodinCooldownAssumptionMinutes", String(Math.round(value)));
  }

  return NextResponse.json({ message: "Settings updated" });
}
