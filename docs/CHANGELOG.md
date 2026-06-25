# Changelog — Book Tracker

All notable changes are recorded here. Format loosely follows Keep a Changelog.

## [Unreleased] — Phase 3.3: Google Books API key for production coverage

### Changed
- `fromGoogleBooks` now sends Google's required `country` param and uses an optional
  `GOOGLE_BOOKS_API_KEY` when set. Without a key, Google Books is rate-limited per shared
  server IP (429 on Vercel), so books that only exist there (e.g. many UK editions like ISBN
  `9780099545897`, which Open Library and Amazon lack) come back "not found". With a free key,
  the quota is per-key and Google Books works reliably in production — greatly improving the
  find rate.
- New env vars: `GOOGLE_BOOKS_API_KEY` (free, no billing) and `GOOGLE_BOOKS_COUNTRY`
  (default `US`; set to your country for better edition matching).

## [Unreleased] — Phase 3.2: Multi-source cover fallback chain

### Added / Changed
- **Cover fallback chain across multiple libraries.** Each book now exposes an ordered
  `coverCandidates` list (stored cover → Open Library by ISBN → **Amazon cover CDN** by
  ISBN-10). `BookCard` tries them in order, advancing on a load error *or* a tiny placeholder
  image (Amazon serves a 1×1 GIF with HTTP 200 when it has no cover). Result: books Open
  Library has no art for now get covers from Amazon — verified all visible books render real
  covers (mix of Open Library + Amazon).
- `lib/isbn.ts`: added `amazonCoverForIsbn10`, `isbn13To10` (978-prefix), and `coverCandidates`
  builder; serializer emits the candidate list for every book (existing rows included, no
  migration).
- Allow-listed `images-na.ssl-images-amazon.com` in `next.config.mjs`.

### Notes
- The Amazon image endpoint is an unofficial (but widely used) CDN path with no API key. It's a
  best-effort cover fallback only; if it ever changes, the chain degrades gracefully to the
  Open Library cover or a titled placeholder.
- OpenBD was evaluated and skipped — its catalog is Japanese-focused, low value for an
  English/UK library; revisit if Japanese titles are added.

## [Unreleased] — Phase 3.1: Metadata coverage & covers

### Changed / Fixed
- **Much better lookup coverage:** `lookupByIsbn` now queries Google Books **and both**
  Open Library endpoints (`jscmd=data` *and* `search.json`) in parallel and merges the
  results. The providers have complementary catalogs, so many books that one source misses
  are resolved by another — fixes the "most books not found" issue.
- **Covers for (almost) every book:**
  - Each lookup backfills a cover from Open Library's cover-by-ISBN endpoint when no provider
    supplies one (`coverUrlForIsbn`, `?default=false` so coverless ISBNs 404 cleanly).
  - The API serializer derives an ISBN cover at read-time for books stored without one, so
    **existing** library entries get covers without a migration.
  - `BookCard` falls back to a placeholder on image error (handles the 404 case gracefully).
- **Transient-failure retry:** provider fetches retry once on timeout/429/5xx so a momentary
  network blip no longer reads as "book not found".

### Added
- `POST /api/books/enrich` — re-fetches metadata for the user's books missing a cover,
  authors, or page count and fills only the empty fields (never overwrites user data). Pulls in
  Google Books covers/descriptions where Open Library lacks them.
- "Refresh details" button in the library header (with progress/result feedback) and
  `enrichBooks()` API client helper.

## [Unreleased] — Phase 3: Barcode scanning & metadata

### Added
- ISBN metadata service (`lib/metadata.ts`): Open Library (primary) → Google Books (fallback),
  with timeouts and graceful failure; normalized `BookMetadata` shape.
- ISBN utilities (`lib/isbn.ts`): normalization, ISBN-10/13 checksum validation, ISBN-10→13.
- `GET /api/metadata/isbn/:isbn` endpoint (400 invalid · 404 not found · 200 metadata).
- In-app barcode scanner (`components/BarcodeScanner.tsx`): camera scanning via ZXing, image
  upload decoding, and manual ISBN entry — all funnel into the same lookup.
- "Scan" button in the library header; resolved metadata prefills the add-book form
  (`BookForm` gains a `prefill` prop); `lib/api.ts` gains `lookupIsbn()`.
- **Auto-add mode** (default on): a scan/lookup adds the book straight to the library as
  "Want to Read" without the form. Continuous camera scanning with per-ISBN dedupe, a live
  "Added this session" feed (added / duplicate / not-found / error), and duplicate detection
  (409 → "Already in library"). Toggle off to fall back to review-before-save. `BarcodeScanner`
  gains an `onAdded` callback that refreshes the library.

### Dependencies
- Added `@zxing/browser`, `@zxing/library` (2 moderate transitive advisories — tracked for
  Phase 7 hardening).

## [Unreleased] — Foundation phase

### Added
- Project scaffold: Next.js (App Router) + TypeScript + Tailwind CSS.
- Prisma schema (SQLite) covering the full product domain: `User`, `Book`, `Author`,
  `BookAuthor`, `Genre`, `BookGenre`, `Series`, `UserBook`, `Shelf`/`ShelfBook`,
  `Collection`/`CollectionBook`, `Review`, `Note`, `ReadingSession`, `Goal`.
- Single local-user model (`lib/user.ts`) with `userId` FKs throughout for future multi-user.
- Library REST API: `GET/POST /api/books`, `GET/PATCH/DELETE /api/books/:id` with Zod
  validation, pagination, search, filter, and sort.
- Frontend library experience: responsive book grid, add/edit dialog form, status filter,
  search, sort, delete confirmation, reading-progress bar, star ratings, favorites.
- In-repo UI kit (`components/ui/*`): button, input/select/textarea/label, dialog.
- AI layer interfaces + stubs (`lib/ai/recommendations.ts`, `lib/ai/insights.ts`).
- Seed script with a default user and three sample books.
- Living documentation in `/docs`: PRD, ARCHITECTURE, ERD, API, ROADMAP, QA-REPORTS, ADRs.

### Notes
- Database is SQLite for local dev; schema kept Postgres-portable.
- Barcode scanning, metadata lookup, analytics, auth, AI wiring, import/export, and PWA are
  designed and scheduled — see ROADMAP.
