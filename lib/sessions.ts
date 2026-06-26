import { prisma } from "@/lib/prisma";
import { coverCandidates } from "@/lib/isbn";
import type { ReadingMood } from "@/lib/constants";
import type {
  Paginated,
  ReadingSessionDTO,
  SessionStats,
} from "@/lib/types";
import type {
  CreateSessionInput,
  ListSessionsQuery,
  StopSessionInput,
  UpdateSessionInput,
} from "@/lib/validation";
import type { Prisma } from "@prisma/client";

// What we always include when reading a ReadingSession so it can be serialized.
const sessionInclude = {
  userBook: {
    select: {
      id: true,
      bookId: true,
      currentPage: true,
      book: { select: { title: true, coverUrl: true, isbn13: true, isbn10: true } },
    },
  },
} satisfies Prisma.ReadingSessionInclude;

type SessionWithBook = Prisma.ReadingSessionGetPayload<{
  include: typeof sessionInclude;
}>;

function serializeSession(s: SessionWithBook): ReadingSessionDTO {
  const cover = coverCandidates({
    stored: s.userBook.book.coverUrl,
    isbn13: s.userBook.book.isbn13,
    isbn10: s.userBook.book.isbn10,
  })[0];
  return {
    id: s.id,
    userBookId: s.userBookId,
    bookId: s.userBook.bookId,
    title: s.userBook.book.title,
    coverUrl: cover ?? null,
    date: s.date.toISOString(),
    minutes: s.minutes,
    pagesRead: s.pagesRead,
    startPage: s.startPage,
    endPage: s.endPage,
    mood: (s.mood as ReadingMood) ?? null,
    note: s.note,
    isActive: s.minutes === null,
    createdAt: s.createdAt.toISOString(),
  };
}

// Ensure a userBookId belongs to this user; throws a typed error otherwise.
async function assertOwnedUserBook(userId: string, userBookId: string) {
  const ub = await prisma.userBook.findUnique({ where: { id: userBookId } });
  if (!ub || ub.userId !== userId) {
    throw new SessionError("That book isn't in your library.", 404);
  }
  return ub;
}

export class SessionError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

export async function listSessions(
  userId: string,
  query: ListSessionsQuery,
): Promise<Paginated<ReadingSessionDTO>> {
  const where: Prisma.ReadingSessionWhereInput = { userId };
  if (query.userBookId) where.userBookId = query.userBookId;
  if (query.mood) where.mood = query.mood;
  if (query.dateFrom || query.dateTo) {
    where.date = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  const [total, rows] = await Promise.all([
    prisma.readingSession.count({ where }),
    prisma.readingSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { date: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(serializeSession),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getSession(
  userId: string,
  id: string,
): Promise<ReadingSessionDTO | null> {
  const row = await prisma.readingSession.findUnique({
    where: { id },
    include: sessionInclude,
  });
  if (!row || row.userId !== userId) return null;
  return serializeSession(row);
}

export async function createSession(
  userId: string,
  input: CreateSessionInput,
): Promise<ReadingSessionDTO> {
  await assertOwnedUserBook(userId, input.userBookId);
  const row = await prisma.readingSession.create({
    data: {
      userId,
      userBookId: input.userBookId,
      date: input.date ?? new Date(),
      minutes: input.minutes,
      pagesRead: input.pagesRead,
      startPage: input.startPage,
      endPage: input.endPage,
      mood: input.mood,
      note: input.note,
    },
    include: sessionInclude,
  });
  return serializeSession(row);
}

export async function updateSession(
  userId: string,
  id: string,
  input: UpdateSessionInput,
): Promise<ReadingSessionDTO | null> {
  const existing = await prisma.readingSession.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;
  if (input.userBookId) await assertOwnedUserBook(userId, input.userBookId);

  const row = await prisma.readingSession.update({
    where: { id },
    data: {
      userBookId: input.userBookId,
      date: input.date,
      minutes: input.minutes,
      pagesRead: input.pagesRead,
      startPage: input.startPage,
      endPage: input.endPage,
      mood: input.mood,
      note: input.note,
    },
    include: sessionInclude,
  });
  return serializeSession(row);
}

export async function deleteSession(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await prisma.readingSession.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.readingSession.delete({ where: { id } });
  return true;
}

// --- Active (live timer) session ---

export async function getActiveSession(
  userId: string,
): Promise<ReadingSessionDTO | null> {
  const row = await prisma.readingSession.findFirst({
    where: { userId, minutes: null },
    include: sessionInclude,
  });
  return row ? serializeSession(row) : null;
}

export async function startSession(
  userId: string,
  userBookId: string,
): Promise<ReadingSessionDTO> {
  const existingActive = await prisma.readingSession.findFirst({
    where: { userId, minutes: null },
  });
  if (existingActive) {
    throw new SessionError(
      "You already have a reading session in progress. Stop it before starting another.",
      409,
    );
  }
  const userBook = await assertOwnedUserBook(userId, userBookId);

  // Starting a session on a book that isn't already "Currently Reading" means
  // exactly that — promote it automatically so the user never has to find a
  // separate status control just to use the timer.
  const shouldPromote =
    userBook.status === "WANT_TO_READ" || userBook.status === "ON_HOLD";

  const [row] = await prisma.$transaction([
    prisma.readingSession.create({
      data: {
        userId,
        userBookId,
        date: new Date(),
        startPage: userBook.currentPage,
        minutes: null,
      },
      include: sessionInclude,
    }),
    ...(shouldPromote
      ? [
          prisma.userBook.update({
            where: { id: userBookId },
            data: {
              status: "CURRENTLY_READING",
              startDate: userBook.startDate ?? new Date(),
            },
          }),
        ]
      : []),
  ]);
  return serializeSession(row as SessionWithBook);
}

export async function stopSession(
  userId: string,
  id: string,
  input: StopSessionInput,
): Promise<ReadingSessionDTO> {
  const existing = await prisma.readingSession.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    throw new SessionError("Session not found.", 404);
  }
  if (existing.minutes !== null) {
    throw new SessionError("This session has already been stopped.", 409);
  }

  const minutes = Math.max(
    1,
    Math.round((Date.now() - existing.date.getTime()) / 60000),
  );
  const endPage = input.endPage ?? undefined;
  const pagesRead =
    input.pagesRead ??
    (endPage !== undefined && existing.startPage !== null
      ? Math.max(0, endPage - existing.startPage)
      : undefined);

  const [row] = await prisma.$transaction([
    prisma.readingSession.update({
      where: { id },
      data: {
        minutes,
        endPage,
        pagesRead,
        mood: input.mood,
        note: input.note,
      },
      include: sessionInclude,
    }),
    ...(endPage !== undefined
      ? [
          prisma.userBook.update({
            where: { id: existing.userBookId },
            data: { currentPage: endPage },
          }),
        ]
      : []),
  ]);

  return serializeSession(row as SessionWithBook);
}

// --- Aggregate stats ---

// Pushed to the database via `aggregate` instead of fetching every completed
// session and summing in JS — at scale this is 4 small indexed queries
// (hitting the existing `[userId, date]` index for the 3 period filters)
// instead of one full-table transfer.
export async function getSessionStats(userId: string): Promise<SessionStats> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const baseWhere = { userId, minutes: { not: null } } as const;

  const [totals, today, week, month, recentDates, moodGroups] = await Promise.all([
    prisma.readingSession.aggregate({
      where: baseWhere,
      _sum: { minutes: true, pagesRead: true },
      _count: true,
    }),
    prisma.readingSession.aggregate({
      where: { ...baseWhere, date: { gte: startOfToday } },
      _sum: { minutes: true, pagesRead: true },
    }),
    prisma.readingSession.aggregate({
      where: { ...baseWhere, date: { gte: startOfWeek } },
      _sum: { minutes: true },
    }),
    prisma.readingSession.aggregate({
      where: { ...baseWhere, date: { gte: startOfMonth } },
      _sum: { minutes: true },
    }),
    // Streak (and the reading-calendar heatmap below) only need which days
    // had a session and how many minutes, not every row — 800 rows
    // comfortably covers years of daily reading on the existing
    // [userId, date] index, far short of a full-table scan.
    prisma.readingSession.findMany({
      where: baseWhere,
      select: { date: true, minutes: true },
      orderBy: { date: "desc" },
      take: 800,
    }),
    // Hits the existing [userId, mood] index, same groupBy convention used
    // by app/api/stats/route.ts and app/api/admin/stats/route.ts.
    prisma.readingSession.groupBy({
      by: ["mood"],
      where: { ...baseWhere, mood: { not: null } },
      _count: true,
    }),
  ]);

  const totalMinutes = totals._sum.minutes ?? 0;
  const totalPagesRead = totals._sum.pagesRead ?? 0;

  // Local-date key (not toISOString, which is UTC and would drift the day
  // boundary away from the local-time `startOfToday` used above).
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  // Zero-padded local-date string — sorts lexicographically and parses back
  // into the correct local-midnight Date, used by both the longest-streak
  // walk below and the heatmap bucketing further down.
  const isoLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const sessionDays = new Set(recentDates.map((s) => dayKey(s.date)));
  let streakDays = 0;
  const cursor = new Date(startOfToday);
  // A streak ending yesterday still counts as "alive" even with nothing
  // logged yet today; only break once we hit a day with zero sessions.
  if (!sessionDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (sessionDays.has(dayKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest streak anywhere in the fetched history (not just the one ending
  // today/yesterday above) — walk the distinct session days oldest-to-newest
  // and track the longest run of calendar-consecutive days. Pure JS over the
  // same `recentDates` rows already in memory, no extra query.
  const sortedDays = Array.from(
    new Set(recentDates.map((s) => isoLocalDate(s.date))),
  ).sort();
  let longestStreakDays = 0;
  let currentRun = 0;
  let prevDay: Date | null = null;
  for (const key of sortedDays) {
    const day = new Date(key);
    if (prevDay) {
      const diffDays = Math.round((day.getTime() - prevDay.getTime()) / 86400000);
      currentRun = diffDays === 1 ? currentRun + 1 : 1;
    } else {
      currentRun = 1;
    }
    longestStreakDays = Math.max(longestStreakDays, currentRun);
    prevDay = day;
  }
  longestStreakDays = Math.max(longestStreakDays, streakDays);

  const ninetyDaysAgo = new Date(startOfToday);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
  const minutesByDay = new Map<string, number>();
  for (const s of recentDates) {
    if (s.date < ninetyDaysAgo) continue;
    const key = isoLocalDate(s.date);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + (s.minutes ?? 0));
  }
  const last90Days = Array.from(minutesByDay, ([date, minutes]) => ({ date, minutes }));

  const moodBreakdown = moodGroups
    .filter((g) => g.mood !== null)
    .map((g) => ({ mood: g.mood as ReadingMood, count: g._count }))
    .sort((a, b) => b.count - a.count);

  return {
    sessionCount: totals._count,
    totalMinutes,
    totalPagesRead,
    avgPagesPerHour:
      totalMinutes > 0 ? Math.round((totalPagesRead / totalMinutes) * 60 * 10) / 10 : null,
    hoursToday: Math.round(((today._sum.minutes ?? 0) / 60) * 10) / 10,
    hoursThisWeek: Math.round(((week._sum.minutes ?? 0) / 60) * 10) / 10,
    hoursThisMonth: Math.round(((month._sum.minutes ?? 0) / 60) * 10) / 10,
    streakDays,
    longestStreakDays,
    pagesToday: today._sum.pagesRead ?? 0,
    last90Days,
    moodBreakdown,
  };
}
