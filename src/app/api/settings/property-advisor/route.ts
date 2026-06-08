import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  setRentalReminderThreshold,
  setManualRentalReminders,
  getPropertyAdvisorSettings,
} from "@/lib/settings";
import type { ManualRentalReminder } from "@/lib/settings";

async function isAuthenticated() {
  return (await cookies()).get("ron_dashboard_auth")?.value === "1";
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if ("rentalExtensionReminderDays" in body) {
    const value = Number(body.rentalExtensionReminderDays);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ message: "Extension reminder threshold must be a positive number of days" }, { status: 400 });
    }
    await setRentalReminderThreshold("rentalExtensionReminderDays", String(Math.round(value)));
  }

  if ("urgentRentalReminderDays" in body) {
    const value = Number(body.urgentRentalReminderDays);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ message: "Urgent reminder threshold must be a positive number of days" }, { status: 400 });
    }
    await setRentalReminderThreshold("urgentRentalReminderDays", String(Math.round(value)));
  }

  if ("addManualReminder" in body) {
    const entry = body.addManualReminder;
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.propertyLabel !== "string" ||
      !entry.propertyLabel.trim() ||
      typeof entry.rentalEndDate !== "string" ||
      !DATE_PATTERN.test(entry.rentalEndDate)
    ) {
      return NextResponse.json({ message: "A manual reminder needs a property label and a rental end date (YYYY-MM-DD)" }, { status: 400 });
    }

    const current = await getPropertyAdvisorSettings();
    const reminder: ManualRentalReminder = {
      id: randomUUID(),
      propertyLabel: entry.propertyLabel.trim(),
      rentalEndDate: entry.rentalEndDate,
      note: typeof entry.note === "string" && entry.note.trim() ? entry.note.trim() : undefined,
    };
    await setManualRentalReminders([...current.manualRentalReminders, reminder]);
  }

  if ("removeManualReminderId" in body) {
    const id = body.removeManualReminderId;
    if (typeof id !== "string") {
      return NextResponse.json({ message: "Invalid reminder id" }, { status: 400 });
    }
    const current = await getPropertyAdvisorSettings();
    await setManualRentalReminders(current.manualRentalReminders.filter((reminder) => reminder.id !== id));
  }

  return NextResponse.json({ message: "Settings updated" });
}
