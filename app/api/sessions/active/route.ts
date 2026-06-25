import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import {
  getActiveSession,
  SessionError,
  startSession,
  stopSession,
} from "@/lib/sessions";
import { startSessionSchema, stopSessionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/sessions/active — the current in-progress timer session, or null.
export async function GET() {
  const user = await getCurrentUser();
  const session = await getActiveSession(user.id);
  return NextResponse.json(session);
}

// POST /api/sessions/active — start the timer on a book.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = startSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const session = await startSession(user.id, parsed.data.userBookId);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

// PATCH /api/sessions/active — stop the running timer.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  const active = await getActiveSession(user.id);
  if (!active) {
    return NextResponse.json(
      { error: "No reading session is currently in progress." },
      { status: 404 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = {};
  }

  const parsed = stopSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const session = await stopSession(user.id, active.id, parsed.data);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof SessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
