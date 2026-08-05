import type {
  CreateBookInput,
  CreateFeedbackInput,
  CreateGoalInput,
  CreateNoteInput,
  CreateSessionInput,
  StopSessionInput,
  UpdateBookInput,
  UpdateFeedbackStatusInput,
  UpdateGoalInput,
  UpdateNoteInput,
  UpdateSessionInput,
} from "@/lib/validation";
import type {
  BetaStats,
  BookGroup,
  CurrentUser,
  GoalDTO,
  LibraryBook,
  LibraryStats,
  NoteDTO,
  Paginated,
  ReadingSessionDTO,
  SessionStats,
} from "@/lib/types";
import type { BookMetadata, BookSearchResult } from "@/lib/metadata";
import type { AdminFeedbackDetail, AdminFeedbackRow, FeedbackDTO } from "@/lib/feedback";
import type { HomeSection } from "@/lib/homeConfig";

// Typed client-side fetch wrappers around the /api/books endpoints.

class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: { error?: string; details?: unknown } = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON error
    }
    throw new ApiRequestError(
      body.error ?? `Request failed (${res.status})`,
      res.status,
      body.details,
    );
  }
  return (await res.json()) as T;
}

export interface ListParams {
  q?: string;
  status?: string;
  favorite?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listBooks(
  params: ListParams = {},
): Promise<Paginated<LibraryBook>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      qs.set(key, String(value));
    }
  }
  const res = await fetch(`/api/books?${qs.toString()}`, {
    cache: "no-store",
  });
  return handle<Paginated<LibraryBook>>(res);
}

export async function getBook(id: string): Promise<LibraryBook> {
  const res = await fetch(`/api/books/${id}`, { cache: "no-store" });
  return handle<LibraryBook>(res);
}

export async function createBook(
  input: CreateBookInput,
): Promise<LibraryBook> {
  const res = await fetch("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<LibraryBook>(res);
}

export async function updateBook(
  id: string,
  input: UpdateBookInput,
): Promise<LibraryBook> {
  const res = await fetch(`/api/books/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<LibraryBook>(res);
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    await handle(res);
  }
}

export interface EnrichResult {
  processed: number;
  updated: number;
  remaining: number;
}

export async function enrichBooks(): Promise<EnrichResult> {
  const res = await fetch("/api/books/enrich", { method: "POST" });
  return handle<EnrichResult>(res);
}

export async function lookupIsbn(isbn: string): Promise<BookMetadata> {
  const res = await fetch(
    `/api/metadata/isbn/${encodeURIComponent(isbn)}`,
    { cache: "no-store" },
  );
  return handle<BookMetadata>(res);
}

export async function searchBookMetadata(
  q: string,
): Promise<{ results: BookSearchResult[] }> {
  const res = await fetch(
    `/api/metadata/search?q=${encodeURIComponent(q)}`,
    { cache: "no-store" },
  );
  return handle<{ results: BookSearchResult[] }>(res);
}

export interface GenreSuggestionItem extends BookSearchResult {
  reasons: string[];
  score: number;
}

export async function searchSuggestionsByGenre(
  genre: string,
): Promise<{ results: GenreSuggestionItem[] }> {
  const res = await fetch(
    `/api/suggestions/genre?genre=${encodeURIComponent(genre)}`,
    { cache: "no-store" },
  );
  return handle<{ results: GenreSuggestionItem[] }>(res);
}

// --- Shelves & Collections (groups) ---
export type GroupBasePath = "shelves" | "collections";

// Presentation fields accepted on create/update. `null` clears a value on
// update; `undefined`/omitted leaves it unchanged.
export interface GroupInput {
  name?: string;
  description?: string;
  imageUrl?: string | null;
  icon?: string | null;
  color?: string | null;
}

export async function listGroups(base: GroupBasePath): Promise<BookGroup[]> {
  const res = await fetch(`/api/${base}`, { cache: "no-store" });
  return handle<BookGroup[]>(res);
}

export async function createGroup(
  base: GroupBasePath,
  input: GroupInput & { name: string },
): Promise<BookGroup> {
  const res = await fetch(`/api/${base}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<BookGroup>(res);
}

// Upload a header image, returning its public URL (two-step: upload → save URL).
export async function uploadGroupImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/groups/image", { method: "POST", body: fd });
  const { url } = await handle<{ url: string }>(res);
  return url;
}

export async function getGroup(
  base: GroupBasePath,
  id: string,
): Promise<{ group: BookGroup; books: LibraryBook[] }> {
  const res = await fetch(`/api/${base}/${id}`, { cache: "no-store" });
  return handle<{ group: BookGroup; books: LibraryBook[] }>(res);
}

export async function updateGroup(
  base: GroupBasePath,
  id: string,
  input: GroupInput,
): Promise<BookGroup> {
  const res = await fetch(`/api/${base}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<BookGroup>(res);
}

export async function deleteGroup(
  base: GroupBasePath,
  id: string,
): Promise<void> {
  const res = await fetch(`/api/${base}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await handle(res);
}

export async function getStats(): Promise<LibraryStats> {
  const res = await fetch("/api/stats", { cache: "no-store" });
  return handle<LibraryStats>(res);
}

// --- Reading sessions ---

export interface ListSessionsParams {
  userBookId?: string;
  mood?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listSessions(
  params: ListSessionsParams = {},
): Promise<Paginated<ReadingSessionDTO>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      qs.set(key, String(value));
    }
  }
  const res = await fetch(`/api/sessions?${qs.toString()}`, {
    cache: "no-store",
  });
  return handle<Paginated<ReadingSessionDTO>>(res);
}

export async function createSession(
  input: CreateSessionInput,
): Promise<ReadingSessionDTO> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<ReadingSessionDTO>(res);
}

export async function updateSession(
  id: string,
  input: UpdateSessionInput,
): Promise<ReadingSessionDTO> {
  const res = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<ReadingSessionDTO>(res);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await handle(res);
}

export async function getActiveSession(): Promise<ReadingSessionDTO | null> {
  const res = await fetch("/api/sessions/active", { cache: "no-store" });
  return handle<ReadingSessionDTO | null>(res);
}

export async function startSession(
  userBookId: string,
): Promise<ReadingSessionDTO> {
  const res = await fetch("/api/sessions/active", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userBookId }),
  });
  return handle<ReadingSessionDTO>(res);
}

export async function stopSession(
  input: StopSessionInput,
): Promise<ReadingSessionDTO> {
  const res = await fetch("/api/sessions/active", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<ReadingSessionDTO>(res);
}

export async function getSessionStats(): Promise<SessionStats> {
  const res = await fetch("/api/sessions/stats", { cache: "no-store" });
  return handle<SessionStats>(res);
}

// --- Current user ---

export async function getCurrentUserInfo(): Promise<CurrentUser> {
  const res = await fetch("/api/me", { cache: "no-store" });
  return handle<CurrentUser>(res);
}

// --- Feedback ---

export async function listMyFeedback(): Promise<FeedbackDTO[]> {
  const res = await fetch("/api/feedback", { cache: "no-store" });
  return handle<FeedbackDTO[]>(res);
}

export async function submitFeedback(
  input: CreateFeedbackInput,
): Promise<FeedbackDTO> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<FeedbackDTO>(res);
}

export async function uploadFeedbackScreenshot(
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.set("file", file);
  const res = await fetch("/api/feedback/screenshot", {
    method: "POST",
    body: formData,
  });
  return handle<{ url: string }>(res);
}

export interface AdminFeedbackListParams {
  type?: string;
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function adminListFeedback(
  params: AdminFeedbackListParams = {},
): Promise<Paginated<AdminFeedbackRow>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== null) {
      qs.set(key, String(value));
    }
  }
  const res = await fetch(`/api/admin/feedback?${qs.toString()}`, {
    cache: "no-store",
  });
  return handle<Paginated<AdminFeedbackRow>>(res);
}

export async function adminGetFeedback(id: string): Promise<AdminFeedbackDetail> {
  const res = await fetch(`/api/admin/feedback/${id}`, { cache: "no-store" });
  return handle<AdminFeedbackDetail>(res);
}

export async function adminUpdateFeedback(
  id: string,
  input: UpdateFeedbackStatusInput,
): Promise<AdminFeedbackDetail> {
  const res = await fetch(`/api/admin/feedback/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<AdminFeedbackDetail>(res);
}

export async function getBetaStats(): Promise<BetaStats> {
  const res = await fetch("/api/admin/stats", { cache: "no-store" });
  return handle<BetaStats>(res);
}

// --- Notes ---

export interface ListNotesParams {
  userBookId?: string;
  type?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listNotes(
  params: ListNotesParams = {},
): Promise<Paginated<NoteDTO>> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const res = await fetch(`/api/notes?${qs.toString()}`, { cache: "no-store" });
  return handle<Paginated<NoteDTO>>(res);
}

export async function createNote(
  input: CreateNoteInput,
): Promise<NoteDTO> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<NoteDTO>(res);
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput,
): Promise<NoteDTO> {
  const res = await fetch(`/api/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<NoteDTO>(res);
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await handle<void>(res);
}

// --- Goals ---

export async function listGoals(): Promise<GoalDTO[]> {
  const res = await fetch("/api/goals", { cache: "no-store" });
  return handle<GoalDTO[]>(res);
}

export async function createGoal(input: CreateGoalInput): Promise<GoalDTO> {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<GoalDTO>(res);
}

export async function updateGoal(
  id: string,
  input: UpdateGoalInput,
): Promise<GoalDTO> {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<GoalDTO>(res);
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await handle<void>(res);
}

// --- Calendar ---

export interface CalendarSessionEntry {
  bookId: string;
  bookTitle: string;
  coverCandidates: string[];
  minutes: number | null;
  pagesRead: number | null;
  mood: string | null;
  note: string | null;
  sessionDate: string;
}

export interface CalendarDay {
  date: string;
  totalMinutes: number;
  totalPages: number;
  sessions: CalendarSessionEntry[];
  primary: CalendarSessionEntry | null;
  extraBookCount: number;
}

export async function getCalendar(
  year: number,
  month: number,
): Promise<CalendarDay[]> {
  const res = await fetch(
    `/api/calendar?year=${year}&month=${month}`,
    { cache: "no-store" },
  );
  return handle<CalendarDay[]>(res);
}

export async function getCalendarRange(
  rangeDays: number,
  offset: number,
): Promise<CalendarDay[]> {
  const res = await fetch(
    `/api/calendar?rangeDays=${rangeDays}&offset=${offset}`,
    { cache: "no-store" },
  );
  return handle<CalendarDay[]>(res);
}

// --- Suggestions ---

export interface SuggestionItem {
  id: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  reasons: string[];
  score: number;
}

export async function getSuggestions(): Promise<SuggestionItem[]> {
  const res = await fetch("/api/suggestions", { cache: "no-store" });
  return handle<SuggestionItem[]>(res);
}

// --- Home config ---

export async function getHomeConfig(): Promise<HomeSection[]> {
  const res = await fetch("/api/home-config", { cache: "no-store" });
  return handle<HomeSection[]>(res);
}

export async function putHomeConfig(config: HomeSection[]): Promise<HomeSection[]> {
  const res = await fetch("/api/home-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return handle<HomeSection[]>(res);
}

export { ApiRequestError };
