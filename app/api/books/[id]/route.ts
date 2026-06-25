import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import {
  serializeLibraryBook,
  syncCollectionMembership,
  syncShelfMembership,
  userBookInclude,
} from "@/lib/books";
import { updateBookSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Resolve a UserBook by id, scoped to the current user (returns null if not theirs).
async function findOwned(id: string, userId: string) {
  const ub = await prisma.userBook.findUnique({ where: { id } });
  if (!ub || ub.userId !== userId) return null;
  return ub;
}

// GET /api/books/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const owned = await findOwned(id, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const full = await prisma.userBook.findUnique({
    where: { id },
    include: userBookInclude,
  });
  return NextResponse.json(serializeLibraryBook(full!));
}

// PATCH /api/books/:id — update library-entry fields and/or book metadata.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const owned = await findOwned(id, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateBookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const input = parsed.data;

  // Split incoming fields into book-level and entry-level updates.
  const bookData: Prisma.BookUpdateInput = {};
  if (input.title !== undefined) bookData.title = input.title;
  if (input.subtitle !== undefined) bookData.subtitle = input.subtitle;
  if (input.description !== undefined) bookData.description = input.description;
  if (input.publisher !== undefined) bookData.publisher = input.publisher;
  if (input.publishedDate !== undefined)
    bookData.publishedDate = input.publishedDate;
  if (input.isbn10 !== undefined) bookData.isbn10 = input.isbn10;
  if (input.isbn13 !== undefined) bookData.isbn13 = input.isbn13;
  if (input.language !== undefined) bookData.language = input.language;
  if (input.pageCount !== undefined) bookData.pageCount = input.pageCount;
  if (input.coverUrl !== undefined) bookData.coverUrl = input.coverUrl;

  const entryData: Prisma.UserBookUpdateInput = {};
  if (input.status !== undefined) entryData.status = input.status;
  if (input.rating !== undefined) entryData.rating = input.rating;
  if (input.favorite !== undefined) entryData.favorite = input.favorite;
  if (input.currentPage !== undefined) entryData.currentPage = input.currentPage;
  if (input.startDate !== undefined) entryData.startDate = input.startDate;
  if (input.finishDate !== undefined) entryData.finishDate = input.finishDate;

  // Author replacement (if provided): clear and recreate ordered links.
  const authorNames =
    input.authors !== undefined
      ? input.authors
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(bookData).length > 0) {
        await tx.book.update({ where: { id: owned.bookId }, data: bookData });
      }
      if (authorNames !== undefined) {
        await tx.bookAuthor.deleteMany({ where: { bookId: owned.bookId } });
        for (let i = 0; i < authorNames.length; i++) {
          const name = authorNames[i];
          const author = await tx.author.upsert({
            where: { name },
            update: {},
            create: { name },
          });
          await tx.bookAuthor.create({
            data: { bookId: owned.bookId, authorId: author.id, order: i },
          });
        }
      }
      if (Object.keys(entryData).length > 0) {
        await tx.userBook.update({ where: { id }, data: entryData });
      }
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Another book already uses that ISBN-13." },
        { status: 409 },
      );
    }
    throw err;
  }

  if (input.shelfIds) {
    await syncShelfMembership(id, user.id, input.shelfIds);
  }
  if (input.collectionIds) {
    await syncCollectionMembership(id, user.id, input.collectionIds);
  }

  const updated = await prisma.userBook.findUnique({
    where: { id },
    include: userBookInclude,
  });
  return NextResponse.json(serializeLibraryBook(updated!));
}

// DELETE /api/books/:id — remove the library entry (keeps the canonical Book row).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const owned = await findOwned(id, user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.userBook.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
