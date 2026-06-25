import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { READING_STATUSES, STATUS_LABELS, type ReadingStatus } from "@/lib/constants";
import type { LibraryStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/stats — aggregate reading statistics for the current user.
export async function GET() {
  const user = await getCurrentUser();

  const userBooks = await prisma.userBook.findMany({
    where: { userId: user.id },
    include: {
      book: {
        include: { authors: { include: { author: true } } },
      },
    },
  });

  const byStatusCount: Record<string, number> = {};
  for (const s of READING_STATUSES) byStatusCount[s] = 0;

  let pagesRead = 0;
  let favorites = 0;
  let ratingSum = 0;
  let ratedCount = 0;
  const authorCount = new Map<string, number>();
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Last 12 months buckets (oldest → newest).
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

  for (const ub of userBooks) {
    byStatusCount[ub.status] = (byStatusCount[ub.status] ?? 0) + 1;
    if (ub.favorite) favorites++;
    if (ub.rating) {
      ratingSum += ub.rating;
      ratedCount++;
      ratingDist[ub.rating] = (ratingDist[ub.rating] ?? 0) + 1;
    }
    if (ub.status === "READ") {
      pagesRead += ub.book.pageCount ?? 0;
      const fin = ub.finishDate ?? ub.updatedAt;
      const key = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}`;
      const idx = monthIndex.get(key);
      if (idx !== undefined) months[idx].count++;
    }
    for (const ba of ub.book.authors) {
      authorCount.set(
        ba.author.name,
        (authorCount.get(ba.author.name) ?? 0) + 1,
      );
    }
  }

  const topAuthors = [...authorCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const stats: LibraryStats = {
    total: userBooks.length,
    read: byStatusCount["READ"] ?? 0,
    reading: byStatusCount["CURRENTLY_READING"] ?? 0,
    wantToRead: byStatusCount["WANT_TO_READ"] ?? 0,
    favorites,
    pagesRead,
    avgRating: ratedCount > 0 ? ratingSum / ratedCount : null,
    ratedCount,
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
    topAuthors,
    ratingDistribution: [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: ratingDist[r],
    })),
  };

  return NextResponse.json(stats);
}
