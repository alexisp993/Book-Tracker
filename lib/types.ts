import type { ReadingStatus } from "@/lib/constants";

// Shape returned by the API for a library entry (UserBook joined with Book).
// Flattened so the UI doesn't need to know the relational layout.
export interface LibraryBook {
  id: string; // UserBook id
  bookId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  isbn10: string | null;
  isbn13: string | null;
  language: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  // Ordered cover-image candidates (best first); the UI tries each in turn.
  coverCandidates: string[];
  status: ReadingStatus;
  rating: number | null;
  favorite: boolean;
  currentPage: number;
  startDate: string | null;
  finishDate: string | null;
  createdAt: string;
  updatedAt: string;
  shelfIds: string[];
  collectionIds: string[];
}

export interface BookGroup {
  id: string;
  name: string;
  description: string | null;
  count: number;
  // a few cover candidates for a preview stack
  covers: string[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface LibraryStats {
  total: number;
  read: number;
  reading: number;
  wantToRead: number;
  favorites: number;
  pagesRead: number;
  avgRating: number | null;
  ratedCount: number;
  byStatus: { status: string; label: string; count: number }[];
  booksPerMonth: { month: string; label: string; count: number }[];
  topAuthors: { name: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
}
