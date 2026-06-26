# Roadmap — Book Tracker

_Owner: Agent 1. Status legend: ✅ done · ◑ partial · ☐ planned._

## Phase 1 — Planning & Architecture ✅
- PRD, user stories, architecture, ERD, API design, folder structure, ADRs. (See `/docs`.)

## Performance Optimization Sprint ✅
Done before further features, per explicit request. Two confirmed critical bugs fixed
(`getCurrentUser` upsert-on-every-request; ISBN scans never checking the local DB first),
DB-side aggregation for stats endpoints, 2 new indexes, a Postgres search case-sensitivity fix,
and full TanStack Query adoption across every data-fetching component. Full findings and
before/after measurements: `docs/PERFORMANCE-AUDIT.md`. Redis, a service worker, and
virtualized lists were evaluated and explicitly deferred (not a fit at current scale).

## Phase 2 — Database, Auth, Accounts ◑
- ✅ Prisma + SQLite schema and migrations.
- ✅ Single local user (`getCurrentUser`) with `userId` FKs throughout.
- ☐ NextAuth (email/password + password reset).
- ☐ Google OAuth.
- ☐ Per-user data isolation hardening once multi-user is live.

## Phase 3 — Library, Barcode, Metadata ✅
- ✅ Library CRUD (add/edit/delete/list), search, filter, sort, pagination.
- ✅ Barcode scanning UI (ZXing): camera, image upload, manual ISBN.
- ✅ Metadata service: Open Library → Google Books fallback (ISBNdb optional later).
- ✅ "Scan → auto-fill" flow that prefills the add form from an ISBN.

## Phase 4 — Progress, Reviews, Shelves, Collections ◑
- ✅ Shelves CRUD + many-to-many assignment UI (chips in the book edit form).
- ✅ Collections CRUD (same pattern as Shelves).
- ◑ Reading progress fields (status, currentPage, start/finish) — now also updated automatically
  by reading sessions (see Bookmory Phase 1 below).
- ☐ Reviews & private notes UI (schema ready, not yet built).

## Phase 5 — Analytics, Goals, AI ◑
- ✅ Stats dashboard (hand-rolled CSS/SVG charts, no chart dependency): books/pages per month,
  status breakdown, rating distribution, top authors, reading-activity totals.
- ☐ Reading goals/challenges UI with auto-progress (schema ready) — see Bookmory Phase 2 below.
- ☐ Reading timeline visualization — see Bookmory Phase 3 below.
- ◑ AI recommendations & insights — interfaces + stubs done; wire Claude API later.

## Bookmory-inspired reading-activity features (5 sub-phases)
Added on top of the phases above; see `docs/QA-REPORTS.md` for audits of each.

- ✅ **Sub-phase 1 — Reading timer & sessions**: live start/stop timer (floating widget),
  manual/retroactive session logging, mood + notes per session, session history with
  filters (mood/date/book) and pagination, lifetime/weekly/monthly activity stats. Stopping a
  session updates `UserBook.currentPage` automatically.
- ☐ Sub-phase 2 — Goals (auto-progress), favorite quotes, full notes UI.
- ☐ Sub-phase 3 — Reading calendar, memory timeline, streaks/pace habit stats, heatmap.
- ☐ Sub-phase 4 — Milestones/badges, completion certificates (client-side PNG export), monthly
  & annual reports.
- ☐ Sub-phase 5 — Dashboard composition, smart in-app nudges, reminder settings (config only,
  no push delivery), rule-based insights (`lib/insights.ts`, deterministic, no paid AI).

## Phase 6 — Import/Export & PWA ☐
- ☐ Import Goodreads / StoryGraph / CSV.
- ☐ Export CSV / Excel / JSON.
- ☐ PWA manifest + service worker; offline viewing of the library.

## Phase 7 — Optimization, Security, Deployment ☐
- ☐ Migrate dev DB design to Postgres (Supabase/Railway); full-text search.
- ☐ Rate limiting, security hardening pass, image optimization (Cloudinary).
- ☐ Optional Redis caching for hot paths.
- ☐ Production deployment (Vercel + managed Postgres).

## Future (designed-for, not scheduled)
- AI Reading Companion: summaries, quizzes, discussion questions, comprehension help.
