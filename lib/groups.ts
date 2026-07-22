import { prisma } from "@/lib/prisma";
import { serializeLibraryBook, userBookInclude } from "@/lib/books";
import { coverCandidates } from "@/lib/isbn";
import type { BookGroup, LibraryBook } from "@/lib/types";

// "Groups" = shelves and collections. They share the same shape (a named set of
// library entries via a join table), so one helper drives both. The two Prisma
// models are accessed through a small dynamic indirection.
export type GroupKind = "shelf" | "collection";

/* eslint-disable @typescript-eslint/no-explicit-any */
function model(kind: GroupKind): any {
  return kind === "shelf" ? prisma.shelf : prisma.collection;
}

const previewInclude = {
  _count: { select: { books: true } },
  books: {
    take: 4,
    include: {
      userBook: {
        include: {
          book: { select: { coverUrl: true, isbn13: true, isbn10: true } },
        },
      },
    },
  },
};

function toGroup(row: any): BookGroup {
  const covers: string[] = [];
  for (const b of row.books ?? []) {
    const bk = b.userBook.book;
    const c = coverCandidates({
      stored: bk.coverUrl,
      isbn13: bk.isbn13,
      isbn10: bk.isbn10,
    })[0];
    if (c) covers.push(c);
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    count: row._count?.books ?? 0,
    covers,
    imageUrl: row.imageUrl ?? null,
    icon: row.icon ?? null,
    color: row.color ?? null,
    updatedAt: (row.updatedAt ?? row.createdAt).toISOString(),
  };
}

// The presentation fields a caller may set on create/update.
export interface GroupInput {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  icon?: string | null;
  color?: string | null;
}

export async function listGroups(
  userId: string,
  kind: GroupKind,
): Promise<BookGroup[]> {
  const rows = await model(kind).findMany({
    where: { userId },
    // Newest activity first — the mockup's default "Recently Updated" sort.
    // The client can re-sort by name or size without a refetch.
    orderBy: { updatedAt: "desc" },
    include: previewInclude,
  });
  return rows.map(toGroup);
}

export async function createGroup(
  userId: string,
  kind: GroupKind,
  input: GroupInput & { name: string },
): Promise<BookGroup> {
  const row = await model(kind).create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl ?? undefined,
      icon: input.icon ?? undefined,
      color: input.color ?? undefined,
    },
    include: previewInclude,
  });
  return toGroup(row);
}

export async function getGroupWithBooks(
  userId: string,
  kind: GroupKind,
  id: string,
): Promise<{ group: BookGroup; books: LibraryBook[] } | null> {
  const row = await model(kind).findFirst({
    where: { id, userId },
    include: {
      ...previewInclude,
      books: {
        include: { userBook: { include: userBookInclude } },
        orderBy: { userBook: { createdAt: "desc" } },
      },
    },
  });
  if (!row) return null;
  const books: LibraryBook[] = row.books.map((b: any) =>
    serializeLibraryBook(b.userBook),
  );
  return { group: toGroup({ ...row, _count: { books: books.length } }), books };
}

export async function updateGroup(
  userId: string,
  kind: GroupKind,
  id: string,
  data: GroupInput,
): Promise<BookGroup | null> {
  const existing = await model(kind).findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await model(kind).update({
    where: { id },
    // Pass fields through as-is: `null` clears image/icon/color, `undefined`
    // leaves them untouched (Prisma ignores undefined).
    data,
    include: previewInclude,
  });
  return toGroup(row);
}

export async function deleteGroup(
  userId: string,
  kind: GroupKind,
  id: string,
): Promise<boolean> {
  const existing = await model(kind).findFirst({ where: { id, userId } });
  if (!existing) return false;
  await model(kind).delete({ where: { id } });
  return true;
}
