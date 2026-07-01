import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  totalPages: number;
  sessions: {
    bookTitle: string;
    coverUrl: string | null;
    minutes: number | null;
    pagesRead: number | null;
    mood: string | null;
  }[];
}

function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  // First and last moment of the requested month (UTC).
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const sessions = await prisma.readingSession.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lt: end },
    },
    include: {
      userBook: {
        select: {
          book: { select: { title: true, coverUrl: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // Group sessions by local day (using UTC date key — sessions are stored as
  // full DateTime so we use the UTC date as the key).
  const byDay = new Map<string, CalendarDay>();

  for (const s of sessions) {
    const key = isoLocalDate(s.date);
    if (!byDay.has(key)) {
      byDay.set(key, {
        date: key,
        totalMinutes: 0,
        totalPages: 0,
        sessions: [],
      });
    }
    const day = byDay.get(key)!;
    day.totalMinutes += s.minutes ?? 0;
    day.totalPages += s.pagesRead ?? 0;
    day.sessions.push({
      bookTitle: s.userBook.book.title,
      coverUrl: s.userBook.book.coverUrl,
      minutes: s.minutes,
      pagesRead: s.pagesRead,
      mood: s.mood,
    });
  }

  return NextResponse.json(Array.from(byDay.values()));
}
