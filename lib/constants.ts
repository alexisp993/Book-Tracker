// Shared domain constants. Status is stored as a String in SQLite but constrained
// to this set everywhere in app code (see lib/validation.ts).

export const READING_STATUSES = [
  "WANT_TO_READ",
  "CURRENTLY_READING",
  "READ",
  "DID_NOT_FINISH",
  "ON_HOLD",
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  WANT_TO_READ: "Want to Read",
  CURRENTLY_READING: "Currently Reading",
  READ: "Read",
  DID_NOT_FINISH: "Did Not Finish",
  ON_HOLD: "On Hold",
};

// Tailwind classes per status, used by the badge.
export const STATUS_STYLES: Record<ReadingStatus, string> = {
  WANT_TO_READ: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  CURRENTLY_READING: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  READ: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  DID_NOT_FINISH: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  ON_HOLD: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

// Solid dot colors per status (used in compact/list views).
export const STATUS_DOT: Record<ReadingStatus, string> = {
  WANT_TO_READ: "bg-blue-500",
  CURRENTLY_READING: "bg-amber-500",
  READ: "bg-emerald-500",
  DID_NOT_FINISH: "bg-rose-500",
  ON_HOLD: "bg-slate-400",
};

export const BOOK_SORTS = [
  "createdAt",
  "title",
  "rating",
  "publishedDate",
] as const;

export type BookSort = (typeof BOOK_SORTS)[number];

export const SORT_LABELS: Record<BookSort, string> = {
  createdAt: "Date added",
  title: "Title",
  rating: "Rating",
  publishedDate: "Publication date",
};

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 100;
