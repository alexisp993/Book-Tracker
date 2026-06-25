# Roadmap — Book Tracker

_Owner: Agent 1. Status legend: ✅ done · ◑ partial · ☐ planned._

## Phase 1 — Planning & Architecture ✅
- PRD, user stories, architecture, ERD, API design, folder structure, ADRs. (See `/docs`.)

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
- ◑ Reading progress fields (status, currentPage, start/finish) — on the entry; needs UI for sessions/timeline.
- ☐ Reviews & private notes UI (schema ready).
- ☐ Shelves CRUD + many-to-many assignment UI (schema ready).
- ☐ Collections CRUD (schema ready).

## Phase 5 — Analytics, Goals, AI ◑
- ☐ Stats dashboard (Recharts): books/pages per month, streaks, genre/author breakdowns, pace.
- ☐ Reading goals/challenges UI with auto-progress (schema ready).
- ☐ Reading timeline visualization.
- ◑ AI recommendations & insights — interfaces + stubs done; wire Claude API.

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
