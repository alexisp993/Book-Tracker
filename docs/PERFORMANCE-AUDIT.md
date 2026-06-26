# Performance Audit & Optimization Sprint

_Owner: Agent 1 (architecture) / Agent 4 (QA, verification). Living document for this sprint._

## Methodology & honesty note

This audit was done by reading the actual code (not estimating), then verifying every fix by
running it — curl timing, direct database checks, and a full browser click-through with network
capture. **Lighthouse, true TTI/LCP/CLS, and a React render-count profiler are not reliably
measurable in this sandboxed dev environment** (no persistent real-Chrome instance with devtools
profiler access). Where a number appears below, it was actually measured as described — not
projected. Where Lighthouse-style metrics would normally appear, this doc says so explicitly
instead of inventing a score.

---

## Bottlenecks found (ranked by confirmed impact)

| # | Finding | Confirmed by | Severity |
|---|---|---|---|
| 1 | `getCurrentUser()` ran a Postgres `upsert` on **every single API request** (every route calls it first) | Read `lib/user.ts:9-13` directly | Critical |
| 2 | ISBN scans never checked the local `Book` table before firing 3 parallel external API calls, even for books already owned | Read `lib/metadata.ts:250-260` directly; reproduced via curl (~14.8s cold external call) | Critical |
| 3 | `/api/stats` and `getSessionStats()` fetched the *entire* table and aggregated in a JS loop | Read both files directly | High (scale risk, not yet a live slowdown at ~20 rows) |
| 4 | Postgres `contains` search had no `mode: "insensitive"` — case-sensitive in prod, masked by SQLite's different default locally | Read `app/api/books/route.ts` directly; reproduced the SQLite runtime rejection of a naive fix | High (correctness bug) |
| 5 | `BookForm` re-fetched shelves + collections on **every dialog open**; `SessionForm`/`ReadingTimer` independently fetched the books list with no shared cache; `ReadingTimer`'s picker fired 3 parallel calls every open | Read all 4 components; reproduced via `preview_network` (see Verification below) | High |
| 6 | Zero `React.memo`/`useMemo`/`useCallback` used for render-cost reasons (4 `useCallback`s existed, all wrapping data-fetch functions, not render optimization) | Grepped the codebase | Medium |
| 7 | Two missing indexes: `Book.publishedDate`, `ReadingSession([userId, mood])` | Read schema vs. query patterns | Low at current scale, free insurance |

---

## Fixes implemented

### A — Quick, safe fixes
- **`lib/user.ts`**: `getCurrentUser()` changed from an unconditional `upsert` to `findUnique`,
  falling through to `create` only on a genuine cache miss (not unconditionally). One subtlety
  caught during implementation: production never runs `prisma db seed` (it only seeds sample
  books for local dev, per `docs/DEPLOY.md`) — the user row has only ever existed because the
  old `upsert` created it on its first-ever call after a fresh deploy. A hard `findUnique`-or-
  throw would have broken that bootstrap path for any future fresh deploy. The shipped fix
  (`find → create-on-miss`) keeps the bootstrap working while still eliminating the per-request
  write in the steady state.
- **`app/api/books/route.ts`**: search `contains` filters now apply `mode: "insensitive"` —
  but only when the active datasource is actually Postgres. Discovered mid-implementation that
  SQLite's query engine rejects the `mode` key outright at *runtime* ("Unknown argument `mode`"),
  not just at the TypeScript type level — a type-only cast was not sufficient. The fix checks
  `DATABASE_URL` at runtime (`file:` = SQLite, anything else = Postgres) and only adds the key
  on Postgres, confirmed working in both modes via curl.
- **`prisma/schema.prisma`**: added `@@index([publishedDate])` on `Book` and
  `@@index([userId, mood])` on `ReadingSession`.

### B — ISBN cache-first
- **`lib/metadata.ts`**: new `findLocalBook(isbn)` checks the local `Book` table (deduped by
  `isbn13 @unique`, normalizing ISBN-10 → 13 first) and is wired into the **scan route**
  (`app/api/metadata/isbn/[isbn]/route.ts`) ahead of the external lookup.
- **Important correction made during implementation**: the cache-first check was initially
  placed inside `lookupByIsbn()` itself — but `app/api/books/enrich` (the "Refresh details"
  button) also calls `lookupByIsbn()` directly, specifically for books that already exist
  locally but are missing fields. Checking locally first inside `lookupByIsbn` would have made
  enrich short-circuit to the same incomplete row it's trying to fix, silently turning "Refresh
  details" into a no-op. Caught this by testing enrich against a deliberately incomplete book
  after the change — it failed to fill in any fields. Fixed by keeping `lookupByIsbn()` always
  hitting the external providers (unchanged), and adding the cache-first check only at the scan
  route's call site. Re-tested afterward: enrich correctly filled in authors/publisher/pages/
  language for an incomplete book.

### C — DB-side aggregation
- **`app/api/stats/route.ts`**: rewritten to use `groupBy`/`aggregate`/`count` for
  status breakdown, rating distribution/average, and favorites count; `topAuthors` is a
  parameterized raw SQL join (Prisma's `groupBy` can't express a 3-table join); `booksPerMonth`
  stays a narrow `findMany` (`select`-only, READ-status-only) since true SQL date-bucketing
  would need raw SQL for no real benefit at this scale.
- **`lib/sessions.ts`**: `getSessionStats()` rewritten to 4 small `aggregate` calls (lifetime
  totals + today/week/month sums) instead of fetching every session row.
- **Correctness verified**: both rewrites were diffed against manually-recomputed values from
  the raw list endpoints on identical data — every field matched exactly (see Verification).

### D — TanStack Query adoption
- Installed `@tanstack/react-query`; added `components/QueryProvider.tsx` (one `QueryClient`
  per browser session) wrapping the app in `app/layout.tsx`.
- New `lib/queries.ts` centralizes query keys, `staleTime`, and mutation invalidations for every
  resource (books, groups, stats, sessions, active session).
- Migrated **all 7** components identified in the audit: `GroupsView`, `StatsView`,
  `LibraryView`, `BookForm`, `SessionForm`, `ReadingTimer`, `SessionHistoryView`.
- **Caught and fixed during implementation**: gating `ReadingTimer`'s picker queries behind
  `enabled: pickerOpen` seemed like the obvious way to keep them lazy, but testing showed
  TanStack Query treats a query going disabled→enabled like a fresh mount and refetches
  immediately — even with fresh data well inside `staleTime`. Confirmed via `preview_network`
  (the picker re-fetched on every reopen despite a 20s `staleTime`). Fixed by removing the
  `enabled` gate entirely: since `ReadingTimer` is a persistent global widget anyway (mounted
  once in `AppShell` for the app's lifetime), there's no real cost to letting these run as
  ordinary always-enabled queries. Re-tested: zero additional requests across repeated
  open/close/reopen cycles within the same page load.
- The 1-second elapsed-time tick in `ReadingTimer` was deliberately kept as plain local
  `setInterval` state — confirmed via network capture that the idle tick produces zero requests.

### E — Memoization
- `BookCard` and `BookRow` wrapped in `React.memo`. Made effective by also wrapping
  `LibraryView`'s `openEdit`/`openAdd`/`handleStartReading` in `useCallback` (with the callback
  depending on the mutation's stable `.mutate` function reference, not the whole mutation result
  object, which TanStack Query may recreate every render) — `setToDelete`/`setEditing` (raw
  `useState` setters) were already stable.
- Deliberately **skipped** `useMemo` on `StatsView`'s `maxMonth`/`maxStatus`/`maxRating`
  (`Math.max` over ≤12-element arrays) — sub-microsecond cost, not a real target.

---

## Explicitly deferred (documented, not built this pass)

- **Redis / shared server cache** — no infra for it; Vercel serverless functions share no memory
  between invocations. DB-side aggregation (Group C) is the real "server cache" lever available
  in this deployment shape.
- **Service worker / offline caching** — a PWA manifest exists but no service worker; adding one
  is net-new infrastructure, not a fix to anything broken. Separate future task.
- **Virtualized lists / infinite scroll** — the library has ~20 books against a 24/page default;
  the entire library already fits on one page. Revisit if/when a library exceeds roughly
  150-200 books, or when multi-user auth ships and library sizes become unpredictable.
- **`next/image` migration for `BookCover`** — its custom multi-source fallback chain (stored →
  Open Library → Amazon, advancing on `onError`/a tiny-placeholder `onLoad` heuristic) isn't
  compatible with `next/image`'s static src model without its own design pass.
- **Specific Lighthouse score targets** — not honestly measurable here; see Methodology above.

---

## Verification (all actually run, not projected)

### Backend timing (curl, local dev, warm)
| Endpoint | Before | After |
|---|---|---|
| `/api/metadata/isbn/:isbn` (ISBN already in DB) | every scan hit 3 external APIs (~1.6-14.8s depending on provider latency / route compile state) | ~0.03-0.04s (single indexed read) |
| `/api/metadata/isbn/:isbn` (genuinely new ISBN) | ~1.6-14.8s (unchanged — correctly still hits providers) | unchanged (correct — only cache hits got faster) |
| `/api/stats` | full `UserBook`+`Book`+`Author` table fetch + JS loop | ~0.03-0.05s warm (6 small indexed queries) |
| `/api/sessions/stats` | full `ReadingSession` table fetch + JS loop | ~0.03-0.04s warm (4 small `aggregate` calls) |

Note: at ~20 books / a handful of sessions, the *absolute* before/after gap for stats endpoints
is small (both were fast) — the value of Group C is in not transferring/parsing the whole table
as the library scales, not in a dramatic local speedup today. The ISBN cache-first fix is the
one with a large, immediately-felt improvement (skips 3 real network round-trips entirely).

### Correctness (DB-side aggregation rewrite)
`/api/stats` and `/api/sessions/stats` output was diffed against values manually recomputed from
the raw `/api/books` and `/api/sessions` list endpoints on identical data. Every field matched
exactly (total, byStatus, favorites, pagesRead, avgRating, ratingDistribution, sessionCount,
totalMinutes, totalPagesRead, avgPagesPerHour). `topAuthors` ordering differed only on ties
(multiple authors with equal counts) — expected and not a regression.

### Network request count (Claude Preview MCP `preview_network`, real click-through)
| Action | Before (confirmed bug) | After (measured) |
|---|---|---|
| Open "Add book" dialog, close, reopen | 2 fresh fetches (`shelves`+`collections`) *every* open | 1 fetch total; reopen produced **zero** new requests |
| Open the floating timer picker, close, reopen ×2 | 3 parallel `listBooks` calls *every* open | 3 calls on first open; **zero** new requests on either reopen (within the same page load) |
| Edit a book's shelf membership, navigate to `/shelves` | required a manual reload to see the change | shelf count updated **immediately**, no reload (confirms the `['groups']` invalidation in `lib/queries.ts` fires correctly) |

### Bundle size (`next build`, before/after)
| | Before | After |
|---|---|---|
| Shared JS (all pages) | ~102 kB | ~102 kB (unchanged) |
| `/` First Load JS | 12.2 kB own / 122 kB total | 10.1 kB own / 133 kB total |
| `/sessions` First Load JS | 5.59 kB own / 115 kB total | 3.35 kB own / 126 kB total |
| `/stats` First Load JS | 4.03 kB own / 114 kB total | 4.69 kB own / 124 kB total |

Total First Load JS rose ~10-11 kB per page — expected, since TanStack Query is a new shared
dependency (the plan explicitly anticipated and accepted this trade for fewer requests/renders).
Each page's *own* code shrank in most cases (home, sessions) since manual fetch/state plumbing
moved into shared hooks in `lib/queries.ts`.

### Functional regression (full pass, all confirmed working)
Library CRUD, case-insensitive search (confirmed: lowercase query matches Title Case book),
every sort key including the new `publishedDate` index (confirmed correct chronological order),
pagination, "Refresh details" enrich (confirmed still reaches external providers for incomplete
books post-cache-first-fix); shelf create/rename/delete, membership toggle via `BookForm` chips
with immediate reflection in `GroupsView`; Stats dashboard renders correctly via the migrated
hooks with output matching pre-rewrite values; full timer cycle (start → auto-promotes
WANT_TO_READ → CURRENTLY_READING, confirmed via API → live elapsed tick confirmed zero network
requests while idle → stop with end page → `currentPage` updated, session recorded) all through
the new mutation hooks, not the old manual fetch code.

`npx tsc --noEmit` and `npm run build` both pass clean on the final Postgres-targeted build.
