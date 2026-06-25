import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

// POST /api/auth/login — exchange the app password for a session cookie.
export async function POST(request: Request) {
  let body: { password?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    // Misconfiguration guard: never allow login when no password is set.
    return NextResponse.json(
      { error: "Server is missing APP_PASSWORD configuration." },
      { status: 500 },
    );
  }

  if (typeof body.password !== "string" || body.password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
