import { z } from "zod";
import {
  BOOK_SORTS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
  MAX_PAGE_SIZE,
  READING_MOODS,
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

// --- Reading sessions ---

const optionalMood = z.preprocess(
  emptyToUndefined,
  z.enum(READING_MOODS).optional(),
);

// Manual/retroactive session creation: duration is provided directly.
export const createSessionSchema = z.object({
  userBookId: z.string().min(1, "Pick a book"),
  date: optionalDate,
  minutes: z.coerce.number().int().min(1).max(1440),
  pagesRead: optionalInt,
  startPage: optionalInt,
  endPage: optionalInt,
  mood: optionalMood,
  note: optionalString,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = createSessionSchema.partial().extend({
  userBookId: z.string().min(1).optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

// Stopping an active (timer-started) session.
export const stopSessionSchema = z.object({
  endPage: optionalInt,
  pagesRead: optionalInt,
  mood: optionalMood,
  note: optionalString,
});

export type StopSessionInput = z.infer<typeof stopSessionSchema>;

export const startSessionSchema = z.object({
  userBookId: z.string().min(1, "Pick a book"),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;

export const listSessionsQuerySchema = z.object({
  userBookId: z.string().optional(),
  mood: z.enum(READING_MOODS).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(24),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;

// --- Auth ---

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const migrateSchema = z.object({
  appPassword: z.string().min(1, "Enter the current app password"),
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export type MigrateInput = z.infer<typeof migrateSchema>;

// --- Feedback ---

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  screenshotUrl: optionalShortString,
  page: optionalShortString,
  browser: optionalShortString,
  deviceType: optionalShortString,
  appVersion: optionalShortString,
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  adminNotes: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(5000).optional(),
  ),
});
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>;

export const adminFeedbackQuerySchema = z.object({
  type: z.enum(FEEDBACK_TYPES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(24),
});
export type AdminFeedbackQuery = z.infer<typeof adminFeedbackQuerySchema>;
