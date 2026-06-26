import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { isAdminEmail, LOCAL_BOOTSTRAP_EMAIL } from "@/lib/user";
import { migrateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/auth/migrate — one-time bridge from the old shared-password
// model to real per-user login. Updates the single account that was
// auto-bootstrapped by the old getCurrentUser() (and owns the existing
// library) with a real email + personal password. Safe to leave deployed
// indefinitely: it's a no-op once that account already has a passwordHash.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = migrateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { appPassword, name, email, password } = parsed.data;

  const expected = process.env.APP_PASSWORD;
  if (!expected || appPassword !== expected) {
    return NextResponse.json({ error: "Incorrect app password." }, { status: 401 });
  }

  const bootstrapUser = await prisma.user.findUnique({
    where: { email: LOCAL_BOOTSTRAP_EMAIL },
  });
  if (!bootstrapUser) {
    return NextResponse.json(
      { error: "No account to migrate. Use Register instead." },
      { status: 404 },
    );
  }
  if (bootstrapUser.passwordHash) {
    return NextResponse.json(
      { error: "This account has already been migrated. Use Login instead." },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: bootstrapUser.id },
      data: { name, email, passwordHash, isAdmin: isAdminEmail(email) },
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    throw err;
  }
}
