import { prisma } from "@/lib/prisma";
import { coverCandidates } from "@/lib/isbn";
import type { NoteType } from "@/lib/constants";
import type { NoteDTO, Paginated } from "@/lib/types";
import type {
  CreateNoteInput,
  ListNotesQuery,
  UpdateNoteInput,
} from "@/lib/validation";
import type { Prisma } from "@prisma/client";

const noteInclude = {
  userBook: {
    select: {
      id: true,
      bookId: true,
      book: { select: { title: true, coverUrl: true, isbn13: true, isbn10: true } },
    },
  },
} satisfies Prisma.NoteInclude;

type NoteWithBook = Prisma.NoteGetPayload<{ include: typeof noteInclude }>;

function serializeNote(n: NoteWithBook): NoteDTO {
  const cover = coverCandidates({
    stored: n.userBook.book.coverUrl,
    isbn13: n.userBook.book.isbn13,
    isbn10: n.userBook.book.isbn10,
  })[0];
  return {
    id: n.id,
    userBookId: n.userBookId,
    bookId: n.userBook.bookId,
    bookTitle: n.userBook.book.title,
    coverUrl: cover ?? null,
    body: n.body,
    page: n.page,
    type: n.type as NoteType,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export async function listNotes(
  userId: string,
  query: ListNotesQuery,
): Promise<Paginated<NoteDTO>> {
  const where: Prisma.NoteWhereInput = { userId };
  if (query.userBookId) where.userBookId = query.userBookId;
  if (query.type) where.type = query.type;
  if (query.q) where.body = { contains: query.q };

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 50;

  const [total, rows] = await Promise.all([
    prisma.note.count({ where }),
    prisma.note.findMany({
      where,
      include: noteInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: rows.map(serializeNote),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createNote(
  userId: string,
  input: CreateNoteInput,
): Promise<NoteDTO> {
  const ub = await prisma.userBook.findUnique({ where: { id: input.userBookId } });
  if (!ub || ub.userId !== userId) {
    throw new NoteError("That book isn't in your library.", 404);
  }
  const row = await prisma.note.create({
    data: {
      userId,
      userBookId: input.userBookId,
      body: input.body,
      page: input.page,
      type: input.type ?? "THOUGHT",
    },
    include: noteInclude,
  });
  return serializeNote(row);
}

export async function updateNote(
  userId: string,
  id: string,
  input: UpdateNoteInput,
): Promise<NoteDTO | null> {
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;
  const row = await prisma.note.update({
    where: { id },
    data: {
      body: input.body,
      page: input.page,
      type: input.type,
    },
    include: noteInclude,
  });
  return serializeNote(row);
}

export async function deleteNote(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.note.delete({ where: { id } });
  return true;
}

export class NoteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "NoteError";
  }
}
