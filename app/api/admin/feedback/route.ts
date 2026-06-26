import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/user";
import { adminListFeedback } from "@/lib/feedback";
import { adminFeedbackQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/admin/feedback — list/filter/search across ALL users' feedback.
// Admin-only.
export async function GET(request: Request) {
  const admin = await requireAdminOrResponse();
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const parsed = adminFeedbackQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return NextResponse.json(await adminListFeedback(parsed.data));
}
