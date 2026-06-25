import type {
  CreateBookInput,
  CreateSessionInput,
  StopSessionInput,
  UpdateBookInput,
  UpdateSessionInput,
} from "@/lib/validation";
import type {
  BookGroup,
  LibraryBook,
  LibraryStats,
  Paginated,
  ReadingSessionDTO,
  SessionStats,
} from "@/lib/types";
import type { BookMetadata } from "@/lib/metadata";

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

// --- Shelves & Collections (groups) ---
export type GroupBasePath = "shelves" | "collections";

export async function listGroups(base: GroupBasePath): Promise<BookGroup[]> {
  const res = await fetch(`/api/${base}`, { cache: "no-store" });
  return handle<BookGroup[]>(res);
}

export async function createGroup(
  base: GroupBasePath,
  input: { name: string; description?: string },
): Promise<BookGroup> {
  const res = await fetch(`/api/${base}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<BookGroup>(res);
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
  input: { name?: string; description?: string },
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

export { ApiRequestError };
