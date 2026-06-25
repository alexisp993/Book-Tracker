import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { lookupByIsbn } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Process at most this many books per call to bound runtime + provider load.
const BATCH_LIMIT = 40;

/**
 * POST /api/books/enrich
 * Re-fetch metadata for the current user's books that are missing a cover,
 * authors, or page count, and fill ONLY the empty fields (never overwrites
 * data the user already has). Uses the full merged lookup, so Google Books
 * covers/descriptions get pulled in where Open Library lacks them.
 */
export async function POST() {
  const user = await getCurrentUser();

  const userBooks = await prisma.userBook.findMany({
    where: { userId: user.id },
    include: { book: { include: { authors: true } } },
  });

  const candidates = userBooks
    .map((ub) => ub.book)
    .filter(
      (b) =>
        (b.isbn13 || b.isbn10) &&
        (!b.coverUrl || b.authors.length === 0 || !b.pageCount),
    )
    .slice(0, BATCH_LIMIT);

  let updated = 0;

  for (const book of candidates) {
    const isbn = book.isbn13 ?? book.isbn10!;
    const meta = await lookupByIsbn(isbn).catch(() => null);
    if (!meta) continue;

    const data: Record<string, unknown> = {};
    if (!book.coverUrl && meta.coverUrl) data.coverUrl = meta.coverUrl;
    if (!book.subtitle && meta.subtitle) data.subtitle = meta.subtitle;
    if (!book.description && meta.description) data.description = meta.description;
    if (!book.publisher && meta.publisher) data.publisher = meta.publisher;
    if (!book.publishedDate && meta.publishedDate)
      data.publishedDate = meta.publishedDate;
    if (!book.pageCount && meta.pageCount) data.pageCount = meta.pageCount;
    if (!book.language && meta.language) data.language = meta.language;
    if (!book.isbn13 && meta.isbn13) data.isbn13 = meta.isbn13;

    const needAuthors = book.authors.length === 0 && meta.authors.length > 0;

    if (Object.keys(data).length === 0 && !needAuthors) continue;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.book.update({ where: { id: book.id }, data });
      }
      if (needAuthors) {
        for (let i = 0; i < meta.authors.length; i++) {
          const name = meta.authors[i];
          const author = await tx.author.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          await tx.bookAuthor.create({
            data: { bookId: book.id, authorId: author.id, order: i },
          });
        }
      }
    });
    updated++;
  }

  return NextResponse.json({
    processed: candidates.length,
    updated,
    remaining: Math.max(
      0,
      userBooks.filter(
        (ub) =>
          (ub.book.isbn13 || ub.book.isbn10) &&
          (!ub.book.coverUrl ||
            ub.book.authors.length === 0 ||
            !ub.book.pageCount),
      ).length - candidates.length,
    ),
  });
}
