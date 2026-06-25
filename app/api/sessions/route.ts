import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { createSession, listSessions, SessionError } from "@/lib/sessions";
import { createSessionSchema, listSessionsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/sessions — paginated, filterable reading-session history.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const parsed = listSessionsQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await listSessions(user.id, parsed.data);
  return NextResponse.json(result);
}

// POST /api/sessions — manually log a (retroactive) reading session.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const session = await createSession(user.id, parsed.data);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof SessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
