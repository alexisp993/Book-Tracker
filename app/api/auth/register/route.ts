import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { isAdminEmail } from "@/lib/user";
import { registerSchema } from "@/lib/validation";
import { MAX_BETA_USERS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/auth/register — create a new beta-tester account, capped at
// MAX_BETA_USERS. The count-then-create isn't fully race-proof under
// simultaneous registrations right at the cap (a known, accepted residual
// risk at ~30-user scale — see docs/adr/ADR-0004), wrapped in one
// transaction as a cheap, no-complexity narrowing of the race window rather
// than full row-locking, which would be disproportionate here.
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { name, email, password } = parsed.data;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const count = await tx.user.count();
      if (count >= MAX_BETA_USERS) {
        // Sentinel thrown to short-circuit the transaction; caught below.
        throw new Error("BETA_FULL");
      }
      const passwordHash = await hashPassword(password);
      return tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          isAdmin: isAdminEmail(email),
        },
      });
    });

    const res = NextResponse.json({ ok: true }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    if (err instanceof Error && err.message === "BETA_FULL") {
      return NextResponse.json(
        {
          error: "BETA_FULL",
          message: `The current beta program has reached its maximum of ${MAX_BETA_USERS} testers.`,
        },
        { status: 403 },
      );
    }
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
