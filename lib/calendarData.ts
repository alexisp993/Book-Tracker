import { prisma } from "@/lib/prisma";
import { coverCandidates } from "@/lib/isbn";

// Single source of truth for "reading calendar" data — consumed identically
// by the month view, the exported/downloaded image, and the Home tab's
// windowed heatmap preview, so none of them can ever draw a different shape
// of data than another.

export interface CalendarSessionEntry {
  bookId: string;
  bookTitle: string;
  // Ordered fallback chain (stored URL -> Open Library -> Amazon), same
  // helper every other cover-rendering surface in the app already uses.
  coverCandidates: string[];
  minutes: number | null;
  pagesRead: number | null;
  mood: string | null;
  note: string | null;
  sessionDate: string; // ISO
}

export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  totalPages: number;
  // Sorted descending by sessionDate — sessions[0] is the most recently read.
  sessions: CalendarSessionEntry[];
  // = sessions[0], the entry whose cover is shown on the day cell.
  primary: CalendarSessionEntry | null;
  // Distinct OTHER bookIds read that day, for a "+N" badge.
  extraBookCount: number;
}

function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getCalendarDays(
  userId: string,
  start: Date,
  endExclusive: Date,
): Promise<CalendarDayData[]> {
  const sessions = await prisma.readingSession.findMany({
    where: {
      userId,
      date: { gte: start, lt: endExclusive },
    },
    include: {
      userBook: {
        select: {
          bookId: true,
          book: {
            select: { title: true, coverUrl: true, isbn13: true, isbn10: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, CalendarDayData>();

  for (const s of sessions) {
    const key = isoLocalDate(s.date);
    if (!byDay.has(key)) {
      byDay.set(key, {
        date: key,
        totalMinutes: 0,
        totalPages: 0,
        sessions: [],
        primary: null,
        extraBookCount: 0,
      });
    }
    const day = byDay.get(key)!;
    day.totalMinutes += s.minutes ?? 0;
    day.totalPages += s.pagesRead ?? 0;
    day.sessions.push({
      bookId: s.userBook.bookId,
      bookTitle: s.userBook.book.title,
      coverCandidates: coverCandidates({
        stored: s.userBook.book.coverUrl,
        isbn13: s.userBook.book.isbn13,
        isbn10: s.userBook.book.isbn10,
      }),
      minutes: s.minutes,
      pagesRead: s.pagesRead,
      mood: s.mood,
      note: s.note,
      sessionDate: s.date.toISOString(),
    });
  }

  for (const day of byDay.values()) {
    day.sessions.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
    day.primary = day.sessions[0] ?? null;
    const distinctBookIds = new Set(day.sessions.map((s) => s.bookId));
    day.extraBookCount = Math.max(0, distinctBookIds.size - 1);
  }

  return Array.from(byDay.values());
}

// The day with the most total reading time, and its dominant session (the
// single largest logged session that day) — powers the Home card's
// "Most reading on X" footer.
export function findTopDay(
  days: CalendarDayData[],
): { day: CalendarDayData; entry: CalendarSessionEntry } | null {
  let best: CalendarDayData | null = null;
  for (const day of days) {
    if (!best || day.totalMinutes > best.totalMinutes) best = day;
  }
  if (!best || best.sessions.length === 0) return null;

  let topEntry = best.sessions[0];
  for (const entry of best.sessions) {
    if ((entry.minutes ?? 0) > (topEntry.minutes ?? 0)) topEntry = entry;
  }
  return { day: best, entry: topEntry };
}
