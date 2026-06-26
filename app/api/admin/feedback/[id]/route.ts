import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/user";
import { adminGetFeedback, adminUpdateFeedback } from "@/lib/feedback";
import { updateFeedbackStatusSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/admin/feedback/:id — full detail (description, screenshot,
// adminNotes). Admin-only.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminOrResponse();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const detail = await adminGetFeedback(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

// PATCH /api/admin/feedback/:id — update status and/or internal notes.
// Admin-only.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminOrResponse();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateFeedbackStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const updated = await adminUpdateFeedback(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
