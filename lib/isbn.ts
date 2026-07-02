// ISBN normalization and validation (ISBN-10 and ISBN-13).

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^[0-9]{9}[0-9X]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = isbn[i];
    const val = ch === "X" ? 10 : Number(ch);
    sum += val * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(isbn: string): boolean {
  if (!/^[0-9]{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isValidIsbn(isbn: string): boolean {
  const n = normalizeIsbn(isbn);
  return isValidIsbn10(n) || isValidIsbn13(n);
}

// Open Library cover image URL by ISBN. `default=false` makes it 404 (rather than
// return a blank image) when no cover exists, so the UI can fall back to a placeholder.
export function coverUrlForIsbn(rawIsbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${normalizeIsbn(rawIsbn)}-L.jpg?default=false`;
}

// Amazon cover image CDN by ISBN-10. Often has covers Open Library lacks. NOTE: when
// a cover is missing it returns a 1x1 placeholder with HTTP 200 (not a 404), so the UI
// must detect tiny images, not just load errors.
export function amazonCoverForIsbn10(rawIsbn10: string): string {
  return `https://images-na.ssl-images-amazon.com/images/P/${normalizeIsbn(rawIsbn10)}.01._SCLZZZZZZZ_.jpg`;
}

// Convert a valid 978-prefixed ISBN-13 to ISBN-10 (needed for Amazon covers).
export function isbn13To10(rawIsbn13: string): string | null {
  const n = normalizeIsbn(rawIsbn13);
  if (!isValidIsbn13(n) || !n.startsWith("978")) return null;
  const core = n.slice(3, 12); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

// Some providers (Google Books) return http:// URLs; force https:// so they
// aren't blocked as mixed content on a deployed HTTPS site.
function toHttps(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  return url.replace(/^http:\/\//i, "https://");
}

// Build the ordered list of cover-image candidates for a book, best first.
// The UI tries each in turn, falling through on load error OR tiny placeholder.
export function coverCandidates(opts: {
  stored?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
}): string[] {
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    if (u && !out.includes(u)) out.push(u);
  };

  const isbn13 = opts.isbn13 ? normalizeIsbn(opts.isbn13) : null;
  const isbn10 =
    (opts.isbn10 ? normalizeIsbn(opts.isbn10) : null) ??
    (isbn13 ? isbn13To10(isbn13) : null);

  push(toHttps(opts.stored));
  if (isbn13) push(coverUrlForIsbn(isbn13));
  else if (isbn10) push(coverUrlForIsbn(isbn10));
  if (isbn10) push(amazonCoverForIsbn10(isbn10));
  return out;
}

// Convert a valid ISBN-10 to ISBN-13 (978 prefix).
export function isbn10To13(isbn10: string): string | null {
  const n = normalizeIsbn(isbn10);
  if (!isValidIsbn10(n)) return null;
  const core = "978" + n.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}
