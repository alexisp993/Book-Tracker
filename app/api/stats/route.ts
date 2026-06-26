import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { READING_STATUSES, STATUS_LABELS, type ReadingStatus } from "@/lib/constants";
import type { LibraryStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/stats — aggregate reading statistics for the current user.
//
// Pushed to the database via groupBy/aggregate instead of `findMany`-the-
// whole-table-then-loop-in-JS, so the work stays cheap as a library grows
// toward 100k+ books: each query below is a small, indexed read, not a full
// table + nested-author transfer. The one piece that stays a narrow
// `findMany` is the 12-month bucket (finishDate-keyed counts) — true SQL
// date-bucketing would need raw SQL for no real benefit at this scale, so a
// `select`-only, READ-status-only query feeds a JS reduction instead.
export async function GET() {
  const user = await getCurrentUser();

  const [statusGroups, ratingAgg, ratingGroups, favorites, readRows, topAuthors] =
    await Promise.all([
      prisma.userBook.groupBy({
        by: ["status"],
        where: { userId: user.id },
        _count: true,
      }),
      prisma.userBook.aggregate({
        where: { userId: user.id, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.userBook.groupBy({
        by: ["rating"],
        where: { userId: user.id, rating: { not: null } },
        _count: true,
      }),
      prisma.userBook.count({ where: { userId: user.id, favorite: true } }),
      prisma.userBook.findMany({
        where: { userId: user.id, status: "READ" },
        select: {
          finishDate: true,
          updatedAt: true,
          book: { select: { pageCount: true } },
        },
      }),
      // Top 5 most-read authors for this user — a 3-table join (UserBook →
      // BookAuthor → Author) that Prisma's groupBy can't express directly
      // since it only groups on one model's own fields, so it's plain
      // parameterized SQL (standard syntax, works unchanged on Postgres and
      // SQLite) rather than N+1 application-side counting.
      prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT a.name as name, COUNT(*) as count
        FROM "UserBook" ub
        JOIN "BookAuthor" ba ON ba."bookId" = ub."bookId"
        JOIN "Author" a ON a.id = ba."authorId"
        WHERE ub."userId" = ${user.id}
        GROUP BY a.name
        ORDER BY count DESC
        LIMIT 5
      `,
    ]);

  const byStatusCount: Record<string, number> = {};
  for (const s of READING_STATUSES) byStatusCount[s] = 0;
  let total = 0;
  for (const g of statusGroups) {
    byStatusCount[g.status] = g._count;
    total += g._count;
  }

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of ratingGroups) {
    if (g.rating != null) ratingDist[g.rating] = g._count;
  }

  // Last 12 months buckets (oldest → newest), reduced from the narrow READ-only fetch.
  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString(undefined, { month: "short" });
    monthIndex.set(key, months.length);
    months.push({ key, label, count: 0 });
  }

  let pagesRead = 0;
  for (const ub of readRows) {
    pagesRead += ub.book.pageCount ?? 0;
    const fin = ub.finishDate ?? ub.updatedAt;
    const key = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx].count++;
  }

  const stats: LibraryStats = {
    total,
    read: byStatusCount["READ"] ?? 0,
    reading: byStatusCount["CURRENTLY_READING"] ?? 0,
    wantToRead: byStatusCount["WANT_TO_READ"] ?? 0,
    favorites,
    pagesRead,
    avgRating: ratingAgg._avg.rating,
    ratedCount: ratingAgg._count.rating,
    byStatus: READING_STATUSES.map((s: ReadingStatus) => ({
      status: s,
      label: STATUS_LABELS[s],
      count: byStatusCount[s] ?? 0,
    })),
    booksPerMonth: months.map((m) => ({
      month: m.key,
      label: m.label,
      count: m.count,
    })),
    topAuthors: topAuthors.map((a) => ({ name: a.name, count: Number(a.count) })),
    ratingDistribution: [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: ratingDist[r],
    })),
  };

  return NextResponse.json(stats);
}
