import { PrismaClient, type Prisma } from "@prisma/client";

// Reuse a single PrismaClient across hot reloads in dev to avoid exhausting
// database connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Case-insensitive `contains` filter. `mode: "insensitive"` is Postgres-only —
// SQLite's query engine rejects the key outright at runtime ("Unknown argument
// `mode`"), it's not just a missing TS type. SQLite's `contains` is already
// case-insensitive for ASCII by default, so the key is only added when the
// active datasource is actually Postgres (detected from DATABASE_URL, which is
// "file:..." locally and "postgres(ql)://..." in production/CI).
const IS_POSTGRES = !process.env.DATABASE_URL?.startsWith("file:");

export function ci(q: string): Prisma.StringFilter {
  return (
    IS_POSTGRES
      ? { contains: q, mode: "insensitive" }
      : { contains: q }
  ) as unknown as Prisma.StringFilter;
}
