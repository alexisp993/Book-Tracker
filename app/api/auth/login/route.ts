import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { isAdminEmail } from "@/lib/user";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// POST /api/auth/login — real per-user email+password login.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic message whether the email doesn't exist or the password is
  // wrong — doesn't reveal which emails are registered.
  const genericError = NextResponse.json(
    { error: "Incorrect email or password." },
    { status: 401 },
  );
  if (!user || !user.passwordHash) return genericError;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return genericError;

  // Keep the admin flag in sync with ADMIN_EMAILS on every login, so editing
  // the env var takes effect without a manual DB edit.
  const shouldBeAdmin = isAdminEmail(user.email);
  if (shouldBeAdmin !== user.isAdmin) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: shouldBeAdmin },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
