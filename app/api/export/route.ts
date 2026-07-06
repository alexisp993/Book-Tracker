import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

// GET /api/export — a full JSON dump of the current user's own data
// (library, sessions, notes, goals). Narrow findMany's scoped to userId,
// same pattern used elsewhere in the app; no pagination since this is a
// one-shot export, not a paged UI list.
export async function GET() {
  const user = await getCurrentUser();

  const [userBooks, sessions, notes, goals] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId: user.id },
      include: {
        book: {
          include: {
            authors: { include: { author: true }, orderBy: { order: "asc" } },
            genres: { include: { genre: true } },
          },
        },
      },
    }),
    prisma.readingSession.findMany({ where: { userId: user.id } }),
    prisma.note.findMany({ where: { userId: user.id } }),
    prisma.goal.findMany({ where: { userId: user.id } }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email, memberSince: user.createdAt },
    books: userBooks.map((ub) => ({
      title: ub.book.title,
      subtitle: ub.book.subtitle,
      authors: ub.book.authors.map((a) => a.author.name),
      genres: ub.book.genres.map((g) => g.genre.name),
      isbn13: ub.book.isbn13,
      isbn10: ub.book.isbn10,
      publisher: ub.book.publisher,
      publishedDate: ub.book.publishedDate,
      pageCount: ub.book.pageCount,
      status: ub.status,
      rating: ub.rating,
      favorite: ub.favorite,
      currentPage: ub.currentPage,
      startDate: ub.startDate,
      finishDate: ub.finishDate,
      addedAt: ub.createdAt,
    })),
    sessions: sessions.map((s) => ({
      date: s.date,
      minutes: s.minutes,
      pagesRead: s.pagesRead,
      startPage: s.startPage,
      endPage: s.endPage,
      mood: s.mood,
      note: s.note,
    })),
    notes: notes.map((n) => ({
      body: n.body,
      page: n.page,
      type: n.type,
      createdAt: n.createdAt,
    })),
    goals: goals.map((g) => ({
      title: g.title,
      type: g.type,
      target: g.target,
      year: g.year,
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="book-tracker-export.json"',
    },
  });
}
