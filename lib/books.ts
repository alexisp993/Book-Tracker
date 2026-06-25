import { prisma } from "@/lib/prisma";
import type { LibraryBook } from "@/lib/types";
import type { ReadingStatus } from "@/lib/constants";
import { coverCandidates } from "@/lib/isbn";
import type { Prisma } from "@prisma/client";

// What we always include when reading a UserBook so it can be serialized.
export const userBookInclude = {
  book: {
    include: {
      authors: {
        include: { author: true },
        orderBy: { order: "asc" },
      },
    },
  },
} satisfies Prisma.UserBookInclude;

type UserBookWithBook = Prisma.UserBookGetPayload<{
  include: typeof userBookInclude;
}>;

export function serializeLibraryBook(ub: UserBookWithBook): LibraryBook {
  // Ordered cover candidates: stored cover → Open Library by ISBN → Amazon by
  // ISBN-10. The UI tries each, so books added before enrichment (or that one
  // provider lacks a cover for) still get art from another source.
  const candidates = coverCandidates({
    stored: ub.book.coverUrl,
    isbn13: ub.book.isbn13,
    isbn10: ub.book.isbn10,
  });

  return {
    id: ub.id,
    bookId: ub.bookId,
    title: ub.book.title,
    subtitle: ub.book.subtitle,
    authors: ub.book.authors.map((ba) => ba.author.name),
    description: ub.book.description,
    publisher: ub.book.publisher,
    publishedDate: ub.book.publishedDate,
    isbn10: ub.book.isbn10,
    isbn13: ub.book.isbn13,
    language: ub.book.language,
    pageCount: ub.book.pageCount,
    coverUrl: candidates[0] ?? null,
    coverCandidates: candidates,
    status: ub.status as ReadingStatus,
    rating: ub.rating,
    favorite: ub.favorite,
    currentPage: ub.currentPage,
    startDate: ub.startDate ? ub.startDate.toISOString() : null,
    finishDate: ub.finishDate ? ub.finishDate.toISOString() : null,
    createdAt: ub.createdAt.toISOString(),
    updatedAt: ub.updatedAt.toISOString(),
  };
}

// Parse a comma-separated author string into a connectOrCreate payload.
export function authorsCreatePayload(
  authors: string | undefined,
): Prisma.BookAuthorCreateNestedManyWithoutBookInput | undefined {
  if (!authors) return undefined;
  const names = authors
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length === 0) return undefined;
  return {
    create: names.map((name, order) => ({
      order,
      author: {
        connectOrCreate: { where: { name }, create: { name } },
      },
    })),
  };
}
