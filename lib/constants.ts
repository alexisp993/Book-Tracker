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

// Closed-beta registration cap. Configurable via env so it can be raised
// later without a code change.
export const MAX_BETA_USERS = Number(process.env.MAX_BETA_USERS) || 30;
export const MAX_PAGE_SIZE = 100;

// Reading-session mood tags.
export const READING_MOODS = [
  "RELAXED",
  "EXCITED",
  "EMOTIONAL",
  "MOTIVATED",
  "INSPIRED",
  "SAD",
  "HAPPY",
  "NEUTRAL",
] as const;

export type ReadingMood = (typeof READING_MOODS)[number];

export const MOOD_LABELS: Record<ReadingMood, string> = {
  RELAXED: "Relaxed",
  EXCITED: "Excited",
  EMOTIONAL: "Emotional",
  MOTIVATED: "Motivated",
  INSPIRED: "Inspired",
  SAD: "Sad",
  HAPPY: "Happy",
  NEUTRAL: "Neutral",
};

export const MOOD_EMOJI: Record<ReadingMood, string> = {
  RELAXED: "😌",
  EXCITED: "🤩",
  EMOTIONAL: "🥹",
  MOTIVATED: "💪",
  INSPIRED: "✨",
  SAD: "😢",
  HAPPY: "😊",
  NEUTRAL: "😐",
};

// Note types for the Reading Notebook.
export const NOTE_TYPES = [
  "HIGHLIGHT",
  "QUOTE",
  "THOUGHT",
  "REVIEW",
  "BOOKMARK",
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  HIGHLIGHT: "Highlight",
  QUOTE: "Quote",
  THOUGHT: "Thought",
  REVIEW: "Review",
  BOOKMARK: "Bookmark",
};

export const NOTE_TYPE_EMOJI: Record<NoteType, string> = {
  HIGHLIGHT: "🌟",
  QUOTE: "💬",
  THOUGHT: "💭",
  REVIEW: "⭐",
  BOOKMARK: "🔖",
};

// Beta feedback.
export const FEEDBACK_TYPES = ["BUG", "FEATURE_REQUEST", "GENERAL"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  BUG: "Bug Report",
  FEATURE_REQUEST: "Feature Request",
  GENERAL: "General Feedback",
};

export const FEEDBACK_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PLANNED",
  "FIXED",
  "CLOSED",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  PLANNED: "Planned",
  FIXED: "Fixed",
  CLOSED: "Closed",
};

// Tailwind classes per feedback status, mirrors STATUS_STYLES above.
export const FEEDBACK_STATUS_STYLES: Record<FeedbackStatus, string> = {
  OPEN: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  PLANNED: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  FIXED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  CLOSED: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};
