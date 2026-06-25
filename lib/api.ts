import type { CreateBookInput, UpdateBookInput } from "@/lib/validation";
import type { LibraryBook, Paginated } from "@/lib/types";
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

export { ApiRequestError };
