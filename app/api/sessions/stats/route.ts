import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { getSessionStats } from "@/lib/sessions";

export const dynamic = "force-dynamic";

// GET /api/sessions/stats — lifetime + period reading-activity totals.
export async function GET() {
  const user = await getCurrentUser();
  const stats = await getSessionStats(user.id);
  return NextResponse.json(stats);
}
