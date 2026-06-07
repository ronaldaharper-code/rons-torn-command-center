import { NextResponse } from "next/server";
import { getTornPublicData, getTornUserData, mapAdminSummary, mapPublicSummary } from "@/lib/torn";

export async function GET(_: Request, context: { params: Promise<{ endpoint: string }> }) {
  const { endpoint } = await context.params;

  try {
    if (endpoint === "public") {
      const data = await getTornPublicData();
      return NextResponse.json(mapPublicSummary(data));
    }

    if (endpoint === "admin") {
      const data = await getTornUserData();
      return NextResponse.json(mapAdminSummary(data));
    }

    return NextResponse.json({ message: "Unknown Torn API endpoint." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
