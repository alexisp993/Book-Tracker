import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { ci, prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { toTitleCase } from "@/lib/utils";
import {
  authorsCreatePayload,
  serializeLibraryBook,
  syncCollectionMembership,
  syncShelfMembership,
  userBookInclude,
} from "@/lib/books";
import {
  createBookSchema,
  listBooksQuerySchema,
} from "@/lib/validation";
import type { Paginated } from "@/lib/types";
import type { LibraryBook } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/books — list the current user's library with search/filter/sort/pagination.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const parsed = listBooksQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { q, status, favorite, sort, order, page, pageSize } = parsed.data;

  const where: Prisma.UserBookWhereInput = { userId: user.id };
  if (status) where.status = status;
  if (favorite !== undefined) where.favorite = favorite;
  if (q) {
    where.OR = [
      { book: { title: ci(q) } },
      { book: { subtitle: ci(q) } },
      { book: { publisher: ci(q) } },
      { book: { isbn10: ci(q) } },
      { book: { isbn13: ci(q) } },
      {
        book: {
          authors: { some: { author: { name: ci(q) } } },
        },
      },
    ];
  }

  // Map sort key to a Prisma orderBy (book-level fields are nested).
  const orderBy: Prisma.UserBookOrderByWithRelationInput =
    sort === "title"
      ? { book: { title: order } }
      : sort === "publishedDate"
        ? { book: { publishedDate: order } }
        : sort === "rating"
          ? { rating: order }
          : { createdAt: order };

  const [total, rows] = await Promise.all([
    prisma.userBook.count({ where }),
    prisma.userBook.findMany({
      where,
      include: userBookInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const body: Paginated<LibraryBook> = {
    items: rows.map(serializeLibraryBook),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
  return NextResponse.json(body);
}

// POST /api/books — create a book and add it to the user's library.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // Reuse an existing Book if the same ISBN-13 is already present, otherwise create.
  let bookId: string;
  const existing = input.isbn13
    ? await prisma.book.findUnique({ where: { isbn13: input.isbn13 } })
    : null;

  if (existing) {
    bookId = existing.id;
    const dup = await prisma.userBook.findUnique({
      where: { userId_bookId: { userId: user.id, bookId } },
    });
    if (dup) {
      return NextResponse.json(
        { error: "This book is already in your library." },
        { status: 409 },
      );
    }
  } else {
    const book = await prisma.book.create({
      data: {
        title: toTitleCase(input.title),
        subtitle: input.subtitle ? toTitleCase(input.subtitle) : input.subtitle,
        description: input.description,
        publisher: input.publisher,
        publishedDate: input.publishedDate,
        isbn10: input.isbn10,
        isbn13: input.isbn13,
        language: input.language,
        pageCount: input.pageCount,
        coverUrl: input.coverUrl,
        source: "MANUAL",
        authors: authorsCreatePayload(input.authors),
      },
    });
    bookId = book.id;
  }

  const created = await prisma.userBook.create({
    data: {
      userId: user.id,
      bookId,
      status: input.status,
      rating: input.rating,
      favorite: input.favorite,
      currentPage: input.currentPage ?? 0,
      startDate: input.startDate,
      finishDate: input.finishDate,
    },
  });

  if (input.shelfIds) {
    await syncShelfMembership(created.id, user.id, input.shelfIds);
  }
  if (input.collectionIds) {
    await syncCollectionMembership(created.id, user.id, input.collectionIds);
  }

  const full = await prisma.userBook.findUnique({
    where: { id: created.id },
    include: userBookInclude,
  });
  return NextResponse.json(serializeLibraryBook(full!), { status: 201 });
}
