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

---

## QA-006 — Bookmory Phase 1: Reading Timer & Sessions

**Reviewed:** 2026-06-25 · **Scope:** `ReadingSession.mood` schema change, `lib/sessions.ts`,
4 new API routes, `ReadingTimer`/`SessionForm`/`SessionHistoryView` components, `/sessions`
page, `AppShell` nav addition, `StatsView` "Reading activity" section.

### Verification performed
- ✅ `npx tsc --noEmit` clean (twice — once on SQLite, once after restoring Postgres).
- ✅ `npm run build` — exit 0; new routes compiled (`/api/sessions`, `/api/sessions/[id]`,
  `/api/sessions/active`, `/api/sessions/stats`, `/sessions`).
- ✅ Live API cycle (curl): start → 201 with `minutes:null,isActive:true`; **double-start → 409**
  with a clear message; active GET reflects in-progress session; stop → `minutes` computed from
  elapsed wall-clock time, `pagesRead` auto-derived from `endPage - startPage` (0→42 produced
  `pagesRead:42`); **`UserBook.currentPage` updated to 42 in the same call** (confirmed via
  `GET /api/books/:id`); mood filter (`?mood=HAPPY` → 1, `?mood=SAD` → 0) correct; manual
  create/delete and validation (missing `minutes` → 422, stop-with-nothing-active → 404) all
  behaved as designed.
- ✅ Full browser walkthrough (mobile viewport, logged in): empty-state picker when no book is
  Currently Reading → set one via API → picker shows it with cover + current page → started →
  floating pill shows live ticking elapsed time → **survived navigating to `/stats`** (mounted
  once in `AppShell`, not per-page) → stopped with end page 58 + mood **Inspired** + a note →
  `/stats` "Reading activity" card and `/sessions` history both reflected the new session
  (auto-calculated 16 pages from 42→58) → mood filter on `/sessions` narrowed to 1 row → edit
  dialog pre-filled every field correctly → **Remove** deleted it and the count dropped back to
  the expected total → manual "Log session" form opened with the book picker populated.

### Findings & resolutions
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | Low | `Stats` page's session-stats fetch doesn't auto-refresh after the timer is stopped from a *different* page (it fetched once on mount). | Acceptable for this phase — a manual revisit/refresh of `/stats` shows correct numbers (verified via API); a shared client-side cache/refetch-on-focus is a polish item, not a correctness bug, and is deferred rather than adding speculative state-management infrastructure now. |
| 2 | Info | `hoursToday`/`hoursThisWeek` can display `0` for very short (1-minute) sessions due to rounding to one decimal place. | Expected and correct (1 min ≈ 0.017h rounds to 0.0); lifetime totals (`totalMinutes`) are exact, only the hour-rounded display fields are affected. No fix needed. |

### Security & performance review
- **Ownership:** every session read/write checks `userId` (via `assertOwnedUserBook` and direct
  `existing.userId !== userId` checks) before acting — consistent with the existing
  `findOwned()` pattern in `app/api/books/[id]/route.ts`. ✅
- **Input validation:** all writes go through Zod (`createSessionSchema`,
  `updateSessionSchema`, `stopSessionSchema`, `startSessionSchema`); mood is constrained to the
  `READING_MOODS` enum-as-string set, rejecting arbitrary values. ✅
- **Concurrency:** "only one active session" is enforced by an explicit existence check before
  insert — correct for a single local user; documented as not safe for concurrent multi-writer
  use without a DB-level constraint, which is consistent with this app's current single-user
  scope (ADR-0002). ✅
- **Pagination:** `/api/sessions` uses the same `page`/`pageSize`/`MAX_PAGE_SIZE` convention as
  `/api/books`, so session history stays bounded as it grows into the thousands. ✅
- **No new indexes required:** the existing `ReadingSession(userId, date)` index covers the new
  list/filter query pattern; verified no slow-query risk at the reviewed data volumes. ✅

### QA STATUS: ✅ APPROVED

Scope matches the agreed Sub-phase 1 (timer, sessions, mood/journal, activity stats). Goals,
quotes, calendar/heatmap, milestones/certificates, reminders, and rule-based insights remain
explicitly out of scope for this pass — tracked in `docs/ROADMAP.md`.

---

## QA-007 — Performance Optimization Sprint

**Reviewed:** 2026-06-26 · **Scope:** `lib/user.ts`, `lib/metadata.ts`, `app/api/stats/route.ts`,
`lib/sessions.ts`, `app/api/books/route.ts`, `prisma/schema.prisma` (2 indexes), full TanStack
Query adoption (`lib/queries.ts` + 7 components), `React.memo` on `BookCard`/`BookRow`. Full
findings, before/after measurements, and methodology caveats: `docs/PERFORMANCE-AUDIT.md`.

### Verification performed
- ✅ Two critical bugs confirmed **by reading the code directly**, not estimated:
  `getCurrentUser()` upserted on every request; ISBN scans never checked the local DB before 3
  external calls.
- ✅ `getCurrentUser` fix: verified the bootstrap-on-fresh-DB path still works (deleted the user
  row, confirmed a request auto-recreates it, 200 not 500) — this matters because production
  never runs `prisma db seed` and has only ever relied on this function to create the user row.
- ✅ Case-insensitive search: the type-only fix didn't work — SQLite's query engine rejects
  `mode` at runtime, not just at the TS type level. Fixed with a runtime check on `DATABASE_URL`;
  confirmed working (no 500) on SQLite and confirmed the branch resolves correctly for Postgres.
- ✅ ISBN cache-first: verified fast path (~0.03-0.04s warm) for a known ISBN vs. external lookup
  for an unknown one (`source` field confirms which path was taken). Caught and fixed a real
  regression risk before it shipped: the cache-first check was initially inside `lookupByIsbn()`,
  which `app/api/books/enrich` also calls for books that exist locally but are incomplete —
  would have made "Refresh details" a silent no-op. Re-tested enrich against a deliberately
  incomplete book after the fix: it correctly filled in authors/publisher/pages/language.
- ✅ Stats aggregation rewrites: output diffed against manually-recomputed values from the raw
  list endpoints on identical data — exact match on every field (topAuthors order differs only
  on ties, expected).
- ✅ TanStack Query adoption verified via real network capture (`preview_network`), not assumed:
  shelves/collections fetch only once across multiple dialog opens (was: every open); timer
  picker fires 3 calls once, zero on repeated reopens within the same page load (was: every
  open) — caught and fixed a real bug here too: gating the picker queries with
  `enabled: pickerOpen` caused TanStack Query to refetch on every re-enable regardless of
  staleTime; fixed by removing the gate (the widget is global/persistent anyway).
- ✅ Shelf-membership invalidation: toggled a chip in `BookForm`, saved, navigated to `/shelves`
  — count updated with no manual reload, confirming the `['groups']` invalidation fires.
- ✅ Full timer cycle re-verified through the new mutation hooks end-to-end: start (status
  auto-promotion confirmed via API), idle tick confirmed zero network requests, stop with end
  page (currentPage updated, session recorded).
- ✅ `npx tsc --noEmit` and `npm run build` clean on the final Postgres-targeted build.

### Findings & resolutions
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | High | Plan assumed `prisma db seed` bootstraps the production user row; it doesn't (production only runs `db push`, never seed — confirmed in `docs/DEPLOY.md`). A hard `findUnique`-or-throw would have broken fresh deploys. | Caught before shipping; changed to find-then-create-on-miss, preserving the bootstrap behavior while still removing the per-request write in steady state. |
| 2 | High | `mode: "insensitive"` type-cast workaround compiled fine but crashed at runtime on SQLite ("Unknown argument `mode`") — the query engine validates independently of TypeScript. | Added a runtime `DATABASE_URL`-based branch instead of a type-only cast; verified no crash on either provider. |
| 3 | High | Cache-first ISBN check placed inside `lookupByIsbn()` would have silently broken the existing "Refresh details" (enrich) feature, which depends on that function always reaching external providers for incomplete local books. | Moved the cache-first check to the scan route's call site only; `lookupByIsbn()` itself is unchanged. Re-tested enrich to confirm. |
| 4 | Medium | `enabled: pickerOpen` gating on `ReadingTimer`'s queries caused a refetch on every reopen (TanStack Query treats disabled→enabled like a fresh mount), defeating the caching goal — confirmed via network capture, not assumed. | Removed the `enabled` gate; the widget is a persistent global component anyway, so always-enabled queries governed by `staleTime` alone work correctly (re-verified: zero refetches on reopen). |
| 5 | Low | Calling a hook (`useBooks`) inside `.map()` over a fixed-length status array violates the Rules of Hooks even though the array length never changes. | Rewritten as 3 explicit hook calls. |

### Security & correctness review
- **Bootstrap safety:** the `getCurrentUser` fix was specifically checked against the
  production deploy flow (no seed step) rather than assumed safe — see Finding #1. ✅
- **No new injection surface:** the raw SQL in `/api/stats` (`topAuthors`) uses Prisma's
  parameterized `$queryRaw` tagged-template (the `userId` value is bound, not interpolated). ✅
- **Cache correctness:** every aggregation rewrite was diffed against the previous
  implementation's output on the same data before being accepted, not just assumed equivalent
  from reading the code. ✅
- **No regression in existing security posture:** ownership checks, Zod validation, and the
  auth middleware are untouched by this sprint. ✅

### Honest scope note
Lighthouse scores, true TTI/LCP/CLS, and React render-count profiling were **not** measured —
this sandboxed environment has no persistent real-Chrome devtools profiler access. What's
reported above (curl timing, request-count via real network capture, bundle sizes via `next
build`, correctness via output diffing) are the metrics that could actually be produced and
verified here. Redis, a service worker, and virtualized lists were evaluated and explicitly
deferred with reasoning — see `docs/PERFORMANCE-AUDIT.md`.

### QA STATUS: ✅ APPROVED

---

## QA-008 — Beta Testing System: Real Auth, Feedback, Admin Dashboard

**Reviewed:** 2026-06-26 · **Scope:** `lib/session.ts` (userId-carrying cookie), `middleware.ts`,
`lib/user.ts` (`getCurrentUser`/`requireAdmin`), `lib/passwords.ts`, register/login/migrate
routes + pages, `Feedback` model + `lib/feedback.ts`, feedback/screenshot/admin API routes,
`lib/queries.ts`/`lib/api.ts` additions, all new components and pages. Design decisions and
reasoning: `docs/adr/ADR-0004-real-multiuser-auth.md`.

### Verification performed
- ✅ Login (correct/wrong password, unknown email) — generic error message either way, doesn't
  reveal which emails are registered.
- ✅ Registration: succeeds under the cap; **blocked with a friendly message (not a raw error)**
  exactly at the cap (tested with `MAX_BETA_USERS=2`: 1st seeded + 1 registered = cap reached,
  3rd attempt → 403 `BETA_FULL` with the spec's exact tone); existing users can still log in
  after the cap is reached; duplicate-email registration correctly returns "already exists"
  (re-tested with the cap raised, since the cap check runs first and otherwise masks this path).
- ✅ Migration: wrong app password rejected; correct one updates the bootstrapped account's
  email/name/password and signs them in; **re-running migrate is idempotent** (409, not
  double-processed); `isAdmin` correctly set from `ADMIN_EMAILS` on migration.
- ✅ `isAdmin` re-syncs against `ADMIN_EMAILS` on every login (not just registration) — verified
  by changing the env var and confirming a re-login flips the flag without a DB edit.
- ✅ Old shared-password login format (`{password}` only, no email) now correctly fails
  validation (422) rather than silently checking `APP_PASSWORD` — confirms `APP_PASSWORD` is
  fully retired from the auth path, not a residual bypass.
- ✅ **Full browser walkthrough**: registered a second real account through the UI → redirected
  to an empty library (confirmed isolated from the admin's 3-book library, not shared/merged);
  account menu showed no Admin links for this non-admin user; **direct URL navigation to
  `/admin/dashboard` as a non-admin redirected to `/`** (server-side guard, not just a hidden
  nav link); submitted feedback through the UI → exact spec thank-you message rendered →
  appeared correctly in that user's own "My Feedback" with status "Open".
- ✅ Logged in as admin: Beta Dashboard rendered correct live numbers (2/30 testers, 28
  remaining, 3 books, 1 feedback item, 1 bug report, "Search is slow on large libraries" listed
  under Most Common Bugs); Admin Feedback list showed the **other** user's submission (cross-
  user visibility, admin-only); detail view showed full description + auto-captured context
  (page, browser UA, device type "mobile", app version) — confirmed **none of this was user-
  entered**, all captured client-side; updated status to "In Progress" + added internal notes
  → saved and persisted.
- ✅ Ownership isolation, explicitly tested both directions: each user's `GET /api/feedback`
  (My Feedback) returns only their own rows; the admin's `GET /api/admin/feedback` correctly
  aggregates across all users.
- ✅ `npx tsc --noEmit` and `npm run build` clean on the final Postgres-targeted build (16 pages,
  31 routes including all new auth/feedback/admin endpoints).

### Findings & resolutions
| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | **High** | `GET /api/feedback` (a user's own "My Feedback") leaked `adminNotes` in the JSON response — found by actually inspecting the live API response after an admin added a note, not assumed safe from reading the code. The UI component didn't render it, but the raw payload was visible via devtools/Network tab. | Removed `adminNotes` from the user-facing `FeedbackDTO` entirely; the admin-only `AdminFeedbackDetail` type (used by `/api/admin/feedback/:id`) is unaffected and still includes it. Re-verified: the field no longer appears in `GET /api/feedback`'s response while the status update remains visible. |
| 2 | Medium | The browser eval tool's `location.pathname` check after a client-side redirect (`router.replace` + `router.refresh`) sometimes read stale state mid-navigation, initially appearing as a failed registration when it had actually succeeded. | Not a product bug — confirmed via screenshot that registration/login/logout all completed correctly each time; just a testing-tool timing quirk, noted so it isn't mistaken for a real issue. |
| 3 | Low | Beta-cap race condition (simultaneous registrations right at the cap) is not fully eliminated by the `$transaction` wrap. | Accepted, documented residual risk per ADR-0004 — disproportionate to fix with full row-locking at 30-user scale. |

### Security review
- **Auth:** passwords hashed with bcrypt (never stored/logged in plaintext); session cookie is
  HMAC-signed and `httpOnly`/`sameSite: lax`/`secure` in production; generic login error message
  prevents email enumeration. ✅
- **Authorization:** every admin route/page calls `requireAdmin()` (or the route-handler
  `requireAdminOrResponse()` wrapper) first — verified server-side, not just hidden UI, via
  direct URL navigation as a non-admin. ✅
- **Ownership:** `listMyFeedback`/`createFeedback` always scope to the calling user's `userId`;
  a user can never read another user's feedback through the non-admin endpoints. ✅
- **Upload validation:** screenshot endpoint checks `Content-Type` against an allowlist
  (png/jpeg/webp) and a 2MB size cap server-side, not just relying on the client. ✅
- **Information disclosure:** the `adminNotes` leak (Finding #1) was caught and fixed before
  sign-off — re-verified clean. ✅
- **Input validation:** all new endpoints (register/login/migrate/feedback/admin) validate via
  Zod schemas in `lib/validation.ts`, consistent with every existing route. ✅

### Honest scope note
Actual Vercel Blob screenshot upload could not be fully exercised in this sandboxed local-dev
environment (no real Blob store token available here) — the route correctly returns a friendly
503 ("not configured yet") when `BLOB_READ_WRITE_TOKEN` is absent, and feedback submission
without a screenshot was fully verified end-to-end. The Blob upload path itself (file → `put()`
→ public URL) should be smoke-tested once deployed with a real Blob store connected, per
`docs/DEPLOY.md`.

### QA STATUS: ✅ APPROVED
