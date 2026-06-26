import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// The email of the single account auto-bootstrapped by the old shared-
// password model, before real per-user registration existed. Used by the
// one-time /api/auth/migrate route to find and upgrade that account.
export const LOCAL_BOOTSTRAP_EMAIL = "local@booktracker.app";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Comma-separated allowlist of admin emails. Checked fresh on every call (not
// just at registration) so promoting/demoting an admin via the env var takes
// effect immediately without a DB edit — the env var is the source of truth;
// `User.isAdmin` is a denormalized cache kept in sync at registration/login.
export function isAdminEmail(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

// Resolves the real logged-in user from the session cookie. Route Handlers
// and Server Components have native access to `cookies()`, so no
// middleware-to-handler identity-passing scheme is needed — middleware only
// decides whether to let the request through at all; this is where identity
// is actually resolved. By the time any protected route's handler runs,
// middleware has already verified a valid session exists, so the
// UnauthorizedError path here is a defensive fallback (e.g. a session for an
// account deleted after the cookie was issued), not the common case.
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new UnauthorizedError();
  return user;
}

// Sibling to getCurrentUser() for admin-only routes/pages — same call-first
// convention used throughout the app.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.isAdmin) throw new UnauthorizedError("Admin access required");
  return user;
}

// Route-handler convenience: every admin API route needs the exact same
// "is this user an admin, and if not, 403 instead of a raw 500" handling.
// Centralizing it means that check can't be forgotten in a new admin route.
// Returns the admin user, or a NextResponse to return immediately.
export async function requireAdminOrResponse() {
  try {
    return await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
