import { z } from "zod";
import {
  BOOK_SORTS,
  MAX_PAGE_SIZE,
  READING_STATUSES,
} from "@/lib/constants";

// Shared Zod schemas used by both API route handlers and client forms.

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(2000).optional(),
);

const optionalShortString = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(255).optional(),
);

const optionalInt = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "string") return Number(v);
  return v;
}, z.number().int().nonnegative().optional());

const optionalDate = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}, z.coerce.date().optional());

// Body for creating a book + its library entry in one call.
export const createBookSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  subtitle: optionalShortString,
  // comma-separated author names from the form; normalized server-side
  authors: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
  description: optionalString,
  publisher: optionalShortString,
  publishedDate: optionalShortString,
  isbn10: optionalShortString,
  isbn13: optionalShortString,
  language: optionalShortString,
  pageCount: optionalInt,
  coverUrl: optionalShortString,
  status: z.enum(READING_STATUSES).default("WANT_TO_READ"),
  rating: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined || v === 0) return undefined;
    if (typeof v === "string") return Number(v);
    return v;
  }, z.number().int().min(1).max(5).optional()),
  favorite: z.coerce.boolean().optional().default(false),
  currentPage: optionalInt,
  startDate: optionalDate,
  finishDate: optionalDate,
  shelfIds: z.array(z.string()).optional(),
  collectionIds: z.array(z.string()).optional(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;

// Patch: same shape, all optional, title cannot be cleared.
export const updateBookSchema = createBookSchema.partial().extend({
  title: z.string().trim().min(1).max(500).optional(),
});

export type UpdateBookInput = z.infer<typeof updateBookSchema>;

// Query params for listing.
export const listBooksQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(READING_STATUSES).optional(),
  favorite: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(BOOK_SORTS).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(24),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

// Shelves & collections (groups).
export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500).optional(),
  ),
});

export const groupUpdateSchema = groupCreateSchema.partial().extend({
  name: z.string().trim().min(1).max(100).optional(),
});
