import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import {
  deleteSession,
  getSession,
  SessionError,
  updateSession,
} from "@/lib/sessions";
import { updateSessionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/sessions/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const session = await getSession(user.id, id);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

// PATCH /api/sessions/:id — edit a logged session.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSessionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const session = await updateSession(user.id, id, parsed.data);
    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof SessionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

// DELETE /api/sessions/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ok = await deleteSession(user.id, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
