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

  const row = await prisma.readingSession.create({
    data: {
      userId,
      userBookId,
      date: new Date(),
      startPage: userBook.currentPage,
      minutes: null,
    },
    include: sessionInclude,
  });
  return serializeSession(row);
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

export async function getSessionStats(userId: string): Promise<SessionStats> {
  const sessions = await prisma.readingSession.findMany({
    where: { userId, minutes: { not: null } },
    select: { minutes: true, pagesRead: true, date: true },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalMinutes = 0;
  let totalPagesRead = 0;
  let minutesToday = 0;
  let minutesThisWeek = 0;
  let minutesThisMonth = 0;

  for (const s of sessions) {
    const mins = s.minutes ?? 0;
    totalMinutes += mins;
    totalPagesRead += s.pagesRead ?? 0;
    if (s.date >= startOfMonth) minutesThisMonth += mins;
    if (s.date >= startOfWeek) minutesThisWeek += mins;
    if (s.date >= startOfToday) minutesToday += mins;
  }

  return {
    sessionCount: sessions.length,
    totalMinutes,
    totalPagesRead,
    avgPagesPerHour:
      totalMinutes > 0 ? Math.round((totalPagesRead / totalMinutes) * 60 * 10) / 10 : null,
    hoursToday: Math.round((minutesToday / 60) * 10) / 10,
    hoursThisWeek: Math.round((minutesThisWeek / 60) * 10) / 10,
    hoursThisMonth: Math.round((minutesThisMonth / 60) * 10) / 10,
  };
}
