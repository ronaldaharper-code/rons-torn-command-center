import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

export async function POST(request: Request) {
  if (!DASHBOARD_PASSWORD) {
    return NextResponse.json({ message: "Dashboard password is not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (!password || password !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "ron_dashboard_auth",
    value: "1",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
