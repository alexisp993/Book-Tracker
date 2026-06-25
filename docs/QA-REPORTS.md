# QA Reports — Book Tracker

_Owner: Agent 4 (QA, Security & Performance). Agent 4 is a skeptical reviewer and does not
rubber-stamp. Each feature is audited; nothing is "done" until **QA STATUS: APPROVED**._

---

## QA-001 — Foundation: scaffold, schema, library CRUD

**Reviewed:** 2026-06-24 · **Scope:** project scaffold, Prisma schema/migration, `/api/books`
endpoints, library UI (grid, add/edit/delete, search/filter/sort/pagination), AI stubs, docs.

### Verification performed
- ✅ `npm install` — exit 0.
- ✅ `npx prisma migrate dev --name init` — migration applied, client generated, seed ran
  (1 user + 3 books).
- ✅ `npx tsc --noEmit` — clean (after fixing one inferred-type error in `BookForm`).
- ✅ `npm run build` — exit 0; routes compiled (`/`, `/api/books`, `/api/books/[id]`).
- ✅ Live API cycle against the dev server:
  - `POST /api/books` → **201**;
  - duplicate ISBN-13 → **409**;
  - empty title → **422**;
  - `q=tolkien` → correct count; `status=READ` filter → correct count;
  - `PATCH` rating/status → **200** with updated values;
  - `DELETE` → **204**; subsequent `GET` → **404**.
- ✅ UI renders: header, toolbar, "3 books in your library", responsive card grid, loading state.

### Findings & resolutions
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Medium | `BookForm` status state inferred as a narrow union, rejected `string` onChange. | Typed state as `string`; cast at submit. Fixed; typecheck clean. |
| 2 | Low (by design) | SQLite `contains` search has no relevance ranking and is LIKE-based. | Accepted for personal scale; Postgres full-text scheduled Phase 7 (logged in ERD §6). |
| 3 | Low (by design) | No auth — all requests resolve to one local user. | Intentional (ADR-0002); `userId` scoping + ownership checks already in place. |

### Security review (OWASP-oriented)
- **Injection:** Prisma parameterizes all queries; no string-built SQL. ✅
- **Input validation:** Zod validates/coerces every write; query params validated; rating bounded
  1–5; page size capped at 100. ✅
- **Broken access control:** every query scoped by `userId`; `findOwned()` checks ownership
  before update/delete (returns 404 otherwise). ✅ (Meaningful once real auth lands.)
- **Mass assignment:** writes go through explicit Zod schemas, not raw spreads. ✅
- **Error handling:** consistent `{ error, details? }`; no stack traces leaked to clients. ✅
- **Gaps (deferred, tracked):** no authn/authz, no rate limiting, no CSRF protection yet —
  required before any public deployment (Phases 2 & 7).

### Performance review
- All list queries `userId`-scoped, indexed, and paginated (default 24, cap 100). ✅
- Count + page fetched concurrently (`Promise.all`). ✅
- Covers lazy-loaded; remote image hosts allow-listed. ✅
- Potential N-considerations: author/genre includes are bounded per page — acceptable. ✅

### QA STATUS: ✅ APPROVED (foundation)
Scope delivered matches the agreed foundation. Deferred items (auth, rate limiting,
full-text search, barcode/metadata, analytics) are explicitly out of this phase and tracked in
ROADMAP. Re-audit required when each is built.

### Conditions carried forward
- Before any non-local deployment: implement auth (Phase 2) and rate limiting + security
  hardening (Phase 7). Single-user mode is **not** safe to expose publicly as-is.

---

## QA-002 — Phase 3: Barcode scanning & ISBN metadata

**Reviewed:** 2026-06-24 · **Scope:** `lib/isbn.ts`, `lib/metadata.ts`,
`GET /api/metadata/isbn/:isbn`, `BarcodeScanner` (camera/upload/manual), `BookForm` prefill,
`LibraryView` scan wiring.

### Verification performed
- ✅ `npx tsc --noEmit` clean · `npm run build` exit 0 (new route `/api/metadata/isbn/[isbn]`).
- ✅ Live metadata API: valid ISBN → 200 with real data (title/authors/publisher/cover/pages);
  hyphenated ISBN normalized (Dune) → 200; invalid (`12345`) → 400.
- ✅ End-to-end UI flow (manual path, exercised in preview): Scan → Manual → enter
  `9780553103540` → Look up → add form **prefilled** "A Game of Thrones / George R. R. Martin"
  → Save → library count 3 → 4, book persisted and searchable.
- ✅ Scanner dialog renders all three tabs; camera viewport + scan guide visible.

### Findings & resolutions
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Medium | `prisma generate` in `build` failed (EPERM) while the dev server held the engine DLL (Windows file lock). | Process/tooling issue, not a code defect: stop dev server before `npm run build`. Build passes clean. Noted for contributors. |
| 2 | Low | Stale dialog copy claimed scanning "arrives in a later phase". | Updated copy to reflect scan-prefill vs manual add. |
| 3 | Low (by design) | Google Books returns 429 from the shared sandbox IP. | It's the *fallback*; Open Library (primary) covers lookups. A Google API key can be added later if needed. |
| 4 | Info | A syntactically-valid but fake ISBN may resolve if a provider has a stray record. | Acceptable — real scans use real ISBNs; we surface whatever the provider returns. |

### Security review
- **SSRF:** the ISBN is normalized to digits/`X` only before being interpolated into fixed
  provider URLs — no user-controlled host/path. ✅
- **Input validation:** ISBN checksum-validated before any outbound call; 400 on invalid. ✅
- **Outbound robustness:** 8s `AbortController` timeout per provider; non-OK/exceptions return
  null and fall through, never crashing the request. ✅
- **Mixed content:** Google cover URLs upgraded `http→https`; remote hosts allow-listed in
  `next.config.mjs`. ✅
- **Camera/privacy:** video stays client-side (ZXing in-browser); only the decoded ISBN string
  is sent to our API. Permission-denied/no-camera handled with graceful fallback to upload/manual. ✅
- **Gap (deferred):** no rate limiting on the metadata endpoint — abuse could proxy load to
  providers. Acceptable single-user/local; add limiting in Phase 7 before public deploy.

### QA STATUS: ✅ APPROVED (Phase 3)
Camera and image-upload paths are implemented and build/typecheck-clean but were **not**
hardware-tested in this environment (no camera/barcode image in the headless preview); the
shared lookup→prefill→save path they feed is verified via the manual entry path. Recommend a
real-device smoke test of camera + a sample barcode photo before relying on them in the field.

---

## QA-003 — Phase 3 addendum: auto-add on scan

**Reviewed:** 2026-06-24 · **Scope:** `BarcodeScanner` auto-add mode + continuous scanning,
`onAdded` wiring in `LibraryView`.

### Verification performed
- ✅ `npx tsc --noEmit` clean.
- ✅ Auto-add toggle defaults **on**; manual ISBN `9780765326355` → added directly (no form);
  library 6 → 7; "Added this session (1)" feed shows "The Way of Kings — Added".
- ✅ Duplicate path: re-submitting `9780553103540` (already in library) → feed "A Game of
  Thrones — Already in library"; count stays 7 (no duplicate row).
- ✅ Toggle off → review-before-save flow unchanged (QA-002 path).

### Findings
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Medium | Continuous camera frames fire the decode callback repeatedly for the same barcode. | `processedRef` (Set of handled ISBNs) added synchronously before the async lookup — repeated frames of the same code are ignored; failed lookups are removed so they remain retryable. |
| 2 | Low | Long-lived camera callback could capture stale `autoAdd`/handlers and restart the camera on every parent re-render. | Values mirrored into refs (`autoAddRef`, `onResolvedRef`, `onAddedRef`, `tabRef`); the camera effect depends only on stable callbacks, so it doesn't tear down mid-scan. |

### Note
Camera continuous-scan dedupe is **not** hardware-verified (no webcam in preview); logic
reviewed and the manual/upload entry points that share `handleIsbn` are verified. Same
real-device smoke-test recommendation as QA-002 stands.

### QA STATUS: ✅ APPROVED

---

## QA-004 — Phase 3.1: Metadata coverage & cover images

**Reviewed:** 2026-06-24 · **Trigger:** user reported "most books not found" and "most scanned
books have no cover." · **Scope:** `lib/metadata.ts`, `lib/isbn.ts`, `lib/books.ts` serializer,
`BookCard`, `POST /api/books/enrich`, `LibraryView` refresh button.

### Root causes (confirmed)
- **Not found:** lookup relied on a single Open Library endpoint (`jscmd=data`), which only has
  rich records for some books. Verified the two OL endpoints are *complementary* (e.g. Project
  Hail Mary missing from `data` but present in `search.json`, and vice-versa for The Silent
  Patient).
- **No cover:** a cover was only stored when a provider explicitly returned one; books without
  were saved with `coverUrl = null` and never recovered.

### Fixes & verification
- ✅ Merged lookup (Google Books + OL data + OL search, parallel): all 5 previously-mixed test
  ISBNs now resolve (verified 200 + titles + covers via curl).
- ✅ Cover-by-ISBN backfill + read-time serializer fallback: previously cover-less books now
  return a cover URL (verified API output for "Hiking Trip", "Other Mothers").
- ✅ `BookCard` `onError` → placeholder: coverless ISBNs (404 from `default=false`) degrade to
  a placeholder rather than a broken image.
- ✅ Retry-once on transient failure added; repeated lookups of the flaky ISBN returned 200.
- ✅ `POST /api/books/enrich`: processed 7 / updated 7 / remaining 0 on the live library;
  "Other Mothers" gained a real cover after enrich (placeholder → cover, confirmed visually).
- ✅ "Refresh details" button renders and is wired; build/typecheck clean.

### Findings
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Medium | Google Books 429s from the shared sandbox IP, so its superior covers/descriptions weren't exercised here. | It's one of three parallel sources and works from a normal IP; OL covers the sandbox. Documented; an API key can be added later if needed. |
| 2 | Low | `enrich` stores the ISBN-fallback cover URL even for coverless books (a URL that 404s). | Harmless — identical to the read-time fallback; `onError` handles it. No broken images. |
| 3 | Info | Some niche titles have no cover in Open Library at all. | Expected. Google Books (reachable on the user's machine) via "Refresh details" can fill many; truly-missing ones show a clean titled placeholder. |

### Note
Visual screenshots were intermittently blocked by archive.org (Open Library's cover CDN)
throttling after heavy test traffic — an upstream/sandbox rate limit, not an app defect; cover
URLs returned 200 and covers rendered once throttling eased.

### QA STATUS: ✅ APPROVED

---

## QA-005 — Phase 3.2: Multi-source cover fallback chain

**Reviewed:** 2026-06-24 · **Trigger:** user asked to use more/multiple libraries for books and
covers. · **Scope:** `lib/isbn.ts` (`coverCandidates`, `amazonCoverForIsbn10`, `isbn13To10`),
`lib/books.ts` serializer, `BookCard`, `next.config.mjs`.

### Source evaluation
| Source | Key needed | Verdict |
|--------|-----------|---------|
| Google Books | no (IP-limited) | Kept (metadata + covers). |
| Open Library (data + search + covers) | no | Kept. |
| Amazon cover CDN (by ISBN-10) | no | **Added** as cover fallback — has covers OL lacks (verified real covers for Hiking Trip, Loyal Friend, One Good Lie, No One Cancels Christmas). |
| OpenBD | no | Skipped — Japanese-focused, low value here. |
| ISBNdb / WorldCat / LibraryThing | yes (paid/key) | Not added (free-only constraint). |

### Verification
- ✅ `coverCandidates` chain built correctly incl. ISBN-13→10 for Amazon (e.g. `9781800329287`
  → `1800329288`); verified via API output.
- ✅ Amazon has real covers (25–48 KB) for the four books that were OL placeholders.
- ✅ In-app: all 12 visible covers load as real images (8 Open Library + 4 Amazon),
  `naturalWidth > 2` for every one; screenshot confirms full cover grid, no placeholders.
- ✅ Tiny-placeholder detection: `onLoad` rejects `naturalWidth <= 2` and advances the chain,
  so Amazon's 1×1 "no cover" GIF never displays.
- ✅ Typecheck + build clean.

### Findings
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Low | Amazon's image path is unofficial and could change. | Best-effort fallback only; chain degrades to OL cover / titled placeholder. Documented. |
| 2 | Low | Each fallback hop is a real image request (a coverless book may fetch OL-404 then Amazon-1px before placeholder). | Lazy-loaded, bounded to ≤3 hops/book; negligible. |

### QA STATUS: ✅ APPROVED
