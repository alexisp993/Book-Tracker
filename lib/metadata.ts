import {
  coverUrlForIsbn,
  isbn10To13,
  isValidIsbn,
  normalizeIsbn,
} from "@/lib/isbn";
import { prisma } from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils";

// Normalized metadata shape shared by all providers and returned to the client.
// Mirrors the editable book fields so it can prefill the add form directly.
export interface BookMetadata {
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  categories?: string[];
  source: string; // which provider(s) supplied the data
}

// A partial result from a single provider before merging.
type PartialMeta = Partial<BookMetadata> & { source: string };

const FETCH_TIMEOUT_MS = 8000;

async function fetchJsonOnce(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "BookTracker/0.1 (personal library app)" },
    });
    // 429 (rate limit) and 5xx are worth a retry; 404 is a definitive miss.
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) throw new Error("retryable");
      return null;
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

// Fetch with one retry on transient failure (timeout, network blip, 429/5xx),
// so a momentary hiccup doesn't read as "book not found".
async function fetchJson(url: string): Promise<unknown | null> {
  try {
    return await fetchJsonOnce(url);
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 350));
      return await fetchJsonOnce(url);
    } catch {
      return null;
    }
  }
}


// --- Provider 1: Google Books (richest: description, categories, language) ----
// An API key makes the quota per-key instead of per-IP — essential on serverless
// hosts (Vercel) whose shared IPs are otherwise rate-limited (429). The `country`
// param is required by the API to return results in many cases.
async function fromGoogleBooks(isbn: string): Promise<PartialMeta | null> {
  const params = new URLSearchParams({ q: `isbn:${isbn}` });
  params.set("country", process.env.GOOGLE_BOOKS_COUNTRY || "US");
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) params.set("key", key);

  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
  )) as GBResponse | null;
  const info = data?.items?.[0]?.volumeInfo;
  if (!info?.title) return null;

  const ids = info.industryIdentifiers ?? [];
  const cover =
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  return {
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    description: info.description,
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    isbn13: ids.find((i) => i.type === "ISBN_13")?.identifier,
    isbn10: ids.find((i) => i.type === "ISBN_10")?.identifier,
    language: info.language,
    pageCount: info.pageCount,
    coverUrl: cover ? cover.replace(/^http:/, "https:") : undefined,
    categories: info.categories,
    source: "GOOGLE_BOOKS",
  };
}

interface GBResponse {
  items?: {
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publisher?: string;
      publishedDate?: string;
      description?: string;
      pageCount?: number;
      categories?: string[];
      language?: string;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
      industryIdentifiers?: { type: string; identifier: string }[];
      averageRating?: number;
      ratingsCount?: number;
    };
  }[];
}

// --- Provider 2: Open Library "data" endpoint --------------------------------
async function fromOpenLibraryData(isbn: string): Promise<PartialMeta | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  )) as Record<string, OLBook> | null;
  const entry = data?.[`ISBN:${isbn}`];
  if (!entry?.title) return null;

  const identifiers = entry.identifiers ?? {};
  return {
    title: entry.title,
    subtitle: entry.subtitle,
    authors: (entry.authors ?? []).map((a) => a.name).filter(Boolean),
    publisher: entry.publishers?.[0]?.name,
    publishedDate: entry.publish_date,
    isbn13: identifiers.isbn_13?.[0],
    isbn10: identifiers.isbn_10?.[0],
    pageCount: entry.number_of_pages,
    coverUrl: entry.cover?.large ?? entry.cover?.medium,
    categories: (entry.subjects ?? []).map((s) => s.name).slice(0, 8),
    source: "OPEN_LIBRARY",
  };
}

interface OLBook {
  title?: string;
  subtitle?: string;
  authors?: { name: string }[];
  publishers?: { name: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
  subjects?: { name: string }[];
  identifiers?: { isbn_10?: string[]; isbn_13?: string[] };
}

// --- Provider 3: Open Library Search (broadest catalog coverage) -------------
async function fromOpenLibrarySearch(
  isbn: string,
): Promise<PartialMeta | null> {
  const data = (await fetchJson(
    `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,subtitle,author_name,first_publish_year,publisher,number_of_pages_median,cover_i,language&limit=1`,
  )) as OLSearchResponse | null;
  const doc = data?.docs?.[0];
  if (!doc?.title) return null;

  return {
    title: doc.title,
    subtitle: doc.subtitle,
    authors: doc.author_name ?? [],
    publisher: doc.publisher?.[0],
    publishedDate: doc.first_publish_year
      ? String(doc.first_publish_year)
      : undefined,
    pageCount: doc.number_of_pages_median,
    language: doc.language?.[0],
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : undefined,
    source: "OPEN_LIBRARY_SEARCH",
  };
}

interface OLSearchResponse {
  docs?: {
    title?: string;
    subtitle?: string;
    author_name?: string[];
    first_publish_year?: number;
    publisher?: string[];
    number_of_pages_median?: number;
    cover_i?: number;
    language?: string[];
  }[];
}

// Merge partials in priority order: first non-empty value wins per field.
function merge(parts: (PartialMeta | null)[]): BookMetadata | null {
  const present = parts.filter((p): p is PartialMeta => p !== null);
  if (present.length === 0) return null;

  const pickStr = (key: keyof BookMetadata): string | undefined => {
    for (const p of present) {
      const v = p[key];
      if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
  };
  const pickNum = (key: keyof BookMetadata): number | undefined => {
    for (const p of present) {
      const v = p[key];
      if (typeof v === "number" && v > 0) return v;
    }
    return undefined;
  };
  const pickArr = (key: "authors" | "categories"): string[] | undefined => {
    for (const p of present) {
      const v = p[key];
      if (Array.isArray(v) && v.length > 0) return v;
    }
    return undefined;
  };

  const title = pickStr("title");
  if (!title) return null;
  const subtitle = pickStr("subtitle");
  const authors = pickArr("authors") ?? [];

  return {
    title: toTitleCase(title),
    subtitle: subtitle ? toTitleCase(subtitle) : subtitle,
    authors: authors.map(toTitleCase),
    description: pickStr("description"),
    publisher: pickStr("publisher"),
    publishedDate: pickStr("publishedDate"),
    isbn10: pickStr("isbn10"),
    isbn13: pickStr("isbn13"),
    language: pickStr("language"),
    pageCount: pickNum("pageCount"),
    coverUrl: pickStr("coverUrl"),
    categories: pickArr("categories"),
    source: present.map((p) => p.source).join("+"),
  };
}

// --- Free-text search (title/author) — used by Add a Book's "Search Books" -
// Distinct from BookMetadata: a search returns many lightweight candidates,
// not one merged detail record. Tapping a result re-resolves the full record
// via the existing lookupByIsbn/findLocalBook pipeline when it has an ISBN.
export interface BookSearchResult {
  title: string;
  subtitle?: string;
  authors: string[];
  publishedDate?: string;
  isbn13?: string;
  coverUrl?: string;
  source: string;
  // Provider-reported popularity — only Google Books exposes this today.
  // Used by the "By Genre" suggestions mode as a tie-breaker signal for
  // books with no personal reading history to score against.
  averageRating?: number;
  ratingsCount?: number;
}

async function searchGoogleBooks(
  query: string,
  maxResults = 20,
  langRestrict?: string,
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  params.set("country", process.env.GOOGLE_BOOKS_COUNTRY || "US");
  if (langRestrict) params.set("langRestrict", langRestrict);
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (key) params.set("key", key);

  const data = (await fetchJson(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
  )) as GBResponse | null;

  return (data?.items ?? [])
    .map((item): BookSearchResult | null => {
      const info = item.volumeInfo;
      if (!info?.title) return null;
      const isbn13 = info.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
      const cover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
      return {
        title: info.title,
        subtitle: info.subtitle,
        authors: info.authors ?? [],
        publishedDate: info.publishedDate,
        isbn13,
        coverUrl: cover ? cover.replace(/^http:/, "https:") : undefined,
        source: "GOOGLE_BOOKS",
        averageRating: info.averageRating,
        ratingsCount: info.ratingsCount,
      };
    })
    .filter((r): r is BookSearchResult => r !== null);
}

async function searchOpenLibrary(
  query: string,
  limit = 20,
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    fields: "title,subtitle,author_name,first_publish_year,isbn,cover_i",
    limit: String(limit),
  });
  const data = (await fetchJson(
    `https://openlibrary.org/search.json?${params.toString()}`,
  )) as OLSearchByQueryResponse | null;

  return (data?.docs ?? [])
    .map((doc): BookSearchResult | null => {
      if (!doc.title) return null;
      // Open Library's `isbn` field is an unsorted list of every edition's
      // ISBN — prefer a 13-digit one so it lines up with our unique index.
      const isbn13 = doc.isbn?.find((i) => i.length === 13);
      return {
        title: doc.title,
        subtitle: doc.subtitle,
        authors: doc.author_name ?? [],
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        isbn13,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : undefined,
        source: "OPEN_LIBRARY_SEARCH",
      };
    })
    .filter((r): r is BookSearchResult => r !== null);
}

interface OLSearchByQueryResponse {
  docs?: {
    title?: string;
    subtitle?: string;
    author_name?: string[];
    first_publish_year?: number;
    isbn?: string[];
    cover_i?: number;
  }[];
}

/**
 * Free-text title/author search across Google Books and Open Library, run
 * in parallel (provider failures isolated, same as lookupByIsbn) and
 * deduped by ISBN-13 — falling back to a lowercase title+first-author key
 * when a result has no ISBN — capped at ~20 results.
 */
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [gb, ol] = await Promise.all([
    searchGoogleBooks(q).catch(() => []),
    searchOpenLibrary(q).catch(() => []),
  ]);

  return dedupeResults([...gb, ...ol]);
}

// Shared by searchBooks and searchBooksByGenre: isbn13 when available,
// otherwise a lowercase title+first-author key.
function dedupeResults(results: BookSearchResult[], limit = 20): BookSearchResult[] {
  const seen = new Set<string>();
  const deduped: BookSearchResult[] = [];
  for (const r of results) {
    const key = r.isbn13 ?? `${r.title.toLowerCase()}|${(r.authors[0] ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

// Genre-based discovery for the suggestions feature — distinct from
// searchBooks' free-text title/author search. Google Books' `subject:`
// query operator restricts to that subject; Open Library has no equivalent
// operator on its general search, but its index already weights subject
// fields, so a plain-text query against the same genre name is a reasonable
// approximation without needing its separate /subjects/ endpoint (whose
// response shape lacks isbn13, which the caller needs for dedup/filtering).
//
// A plain relevance-only query skewed heavily toward old backlist titles
// (decades-old category tags accumulate the most keyword/subject matches
// over time), so a wider relevance-ranked pool feeds getGenreSuggestions'
// recency scoring more candidates to promote. Sorting the fetch itself by
// "newest" was tried and reverted — Open Library's raw newest-first feed is
// uncurated (foreign-language webtoon volumes, single self-published
// chapters, near-future placeholder dates), which read as worse than the
// old-book problem it was meant to fix. English-restricting the Google
// Books side cuts a large share of that same noise there.
export async function searchBooksByGenre(genre: string): Promise<BookSearchResult[]> {
  const g = genre.trim();
  if (!g) return [];

  const [gb, ol] = await Promise.all([
    searchGoogleBooks(`subject:"${g}"`, 40, "en").catch(() => []),
    searchOpenLibrary(g, 40).catch(() => []),
  ]);

  return dedupeResults([...gb, ...ol], 30);
}

// Check the local Book table before hitting any external provider. Books are
// deduped by `isbn13 @unique`, so a 10-digit scan is normalized to 13 first.
// Used by the scan/lookup API route (app/api/metadata/isbn/[isbn]/route.ts) —
// NOT by `lookupByIsbn` itself, because `app/api/books/enrich` also calls
// `lookupByIsbn` directly, specifically for books that ARE already in the
// local DB but missing fields; if the local check lived inside `lookupByIsbn`,
// enrich would short-circuit to the same incomplete row it's trying to fix and
// "Refresh details" would become a no-op. So: the scan path checks local
// first (fast path for a book you already own), while `lookupByIsbn` always
// queries the external providers (which enrich relies on to fill gaps).
export async function findLocalBook(isbn: string): Promise<BookMetadata | null> {
  const isbn13 = isbn.length === 13 ? isbn : isbn10To13(isbn);
  if (!isbn13) return null;

  const book = await prisma.book.findUnique({
    where: { isbn13 },
    include: { authors: { include: { author: true }, orderBy: { order: "asc" } } },
  });
  if (!book) return null;

  return {
    title: book.title,
    subtitle: book.subtitle ?? undefined,
    authors: book.authors.map((ba) => ba.author.name),
    description: book.description ?? undefined,
    publisher: book.publisher ?? undefined,
    publishedDate: book.publishedDate ?? undefined,
    isbn10: book.isbn10 ?? undefined,
    isbn13: book.isbn13 ?? undefined,
    language: book.language ?? undefined,
    pageCount: book.pageCount ?? undefined,
    coverUrl: book.coverUrl ?? coverUrlForIsbn(isbn13),
    source: "LOCAL",
  };
}

/**
 * Look up book metadata by ISBN from external providers (always — does not
 * check the local DB; see `findLocalBook` for the cache-first path used by
 * the scan route). Queries Google Books and both Open Library endpoints in
 * parallel and merges them — the providers have complementary coverage, so
 * combining them resolves far more books than any one alone. Always
 * backfills a cover image via Open Library's cover-by-ISBN endpoint when no
 * provider supplied one. Returns null only if no provider has the book.
 */
export async function lookupByIsbn(
  rawIsbn: string,
): Promise<BookMetadata | null> {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isValidIsbn(isbn)) return null;

  const [gb, olData, olSearch] = await Promise.all([
    fromGoogleBooks(isbn).catch(() => null),
    fromOpenLibraryData(isbn).catch(() => null),
    fromOpenLibrarySearch(isbn).catch(() => null),
  ]);

  const merged = merge([gb, olData, olSearch]);
  if (!merged) return null;

  // Ensure ISBN-13 is populated (helps dedupe + cover lookup).
  if (!merged.isbn13) {
    merged.isbn13 =
      isbn.length === 13 ? isbn : (isbn10To13(isbn) ?? undefined);
  }
  if (!merged.isbn10 && isbn.length === 10) merged.isbn10 = isbn;

  // Backfill cover by ISBN if none came from a provider.
  if (!merged.coverUrl) {
    merged.coverUrl = coverUrlForIsbn(merged.isbn13 ?? merged.isbn10 ?? isbn);
  }

  return merged;
}
