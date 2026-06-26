import { prisma } from "@/lib/prisma";

// Single-user mode (this phase). Every request resolves to one local user.
// When real auth lands, replace getCurrentUser() with the session lookup —
// the rest of the app already keys off the returned user id.
export const LOCAL_USER_EMAIL = "local@booktracker.app";

// Every API route calls this first. Production never runs `prisma db seed`
// (it only seeds sample books for local dev — see docs/DEPLOY.md), so the user
// row has always been bootstrapped by this function on its very first call
// after a fresh deploy. An unconditional `upsert` here issued a write-path
// query on EVERY request just to handle that one-time case. Fix: read first
// (the steady-state path, after the row exists, is a single indexed read);
// only fall through to `create` on a genuine cache miss — which happens
// exactly once per fresh database, not once per request.
export async function getCurrentUser() {
  const existing = await prisma.user.findUnique({
    where: { email: LOCAL_USER_EMAIL },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: { email: LOCAL_USER_EMAIL, name: "You" },
  });
}
