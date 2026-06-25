import { prisma } from "@/lib/prisma";

// Single-user mode (this phase). Every request resolves to one local user.
// When real auth lands, replace getCurrentUser() with the session lookup —
// the rest of the app already keys off the returned user id.
export const LOCAL_USER_EMAIL = "local@booktracker.app";

export async function getCurrentUser() {
  const user = await prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL, name: "You" },
  });
  return user;
}
