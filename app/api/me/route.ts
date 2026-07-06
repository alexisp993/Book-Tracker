import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import type { CurrentUser } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/me — minimal current-user info for client components that need
// to know who's logged in / whether they're an admin (e.g. AppShell's nav).
export async function GET() {
  const user = await getCurrentUser();
  const me: CurrentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  };
  return NextResponse.json(me);
}
