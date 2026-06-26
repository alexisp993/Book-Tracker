# Architecture — Book Tracker

_Owner: Agent 1. Living document._

## 1. System overview

A single Next.js (App Router) application that serves both the UI (React Server + Client
Components) and the JSON API (Route Handlers under `app/api`). Data lives in a relational
database accessed through Prisma. There is no separate backend service — the "frontend" and
"backend" are two layers of one deployable, which keeps the foundation simple and fast to
iterate while remaining easy to split later if needed.

```
Browser (React, mobile-first PWA-ready)
        │  fetch JSON
        ▼
Next.js Route Handlers (app/api/*)  ── Zod validation ──┐
        │                                               │
        ▼                                               ▼
Prisma Client  ───────────────────────────────►  SQLite (dev) / Postgres (prod)
        ▲
        └── lib/ai/* (stubbed; Claude API later)
```

## 2. Key decisions & tradeoffs

| Decision | Choice | Why | Tradeoff |
|----------|--------|-----|----------|
| App framework | Next.js App Router (full-stack) | One codebase, SSR + API together, Vercel-friendly | Less separation than a dedicated API service |
| DB (dev) | SQLite via Prisma | Zero setup on Windows, instant | Some Postgres features unavailable; mitigated by portable schema |
| DB (prod) | Postgres (Supabase/Railway) | Scales to the 100k+/user target | Requires migration when we switch providers |
| Enums | Stored as `String` + validated in code | SQLite has no native enums; keeps schema portable | Validation lives in app, not DB constraint |
| Lists (authors/genres) | Join tables, not scalar arrays | SQLite has no arrays; also enables querying/aggregation | More tables |
| Auth | Custom per-user (email + bcrypt password), not NextAuth | Extends the existing hand-rolled session cookie instead of adding a framework — consistent with every other build-it-simple choice in this app; see `docs/adr/ADR-0004-real-multiuser-auth.md` | No self-service password reset yet (mitigated: "email the admin") |
| AI | Interface-first stubs | Build/test UI + API without an API key | No live recommendations yet |
| Validation | Zod, shared client+server | Single source of truth for shapes | — |

See `docs/adr/` for the full decision records.

## 3. Data model (summary)

`User` owns `UserBook` entries (the per-user library row), which reference a shared, deduped
`Book`. Books link to `Author` and `Genre` via join tables and optionally a `Series`.
`UserBook` is the anchor for `Shelf`/`Collection` membership, `Review`, `Note`, and
`ReadingSession`. `Goal` belongs directly to the user. Full ERD in [ERD.md](./ERD.md).

Rationale for the shared-`Book` / per-user-`UserBook` split: metadata (title, ISBN, cover) is
identical across users and should be deduped by ISBN-13, while reading state (status, rating,
progress, dates) is personal. This mirrors Goodreads/StoryGraph internals and avoids
duplicating metadata as the catalog grows toward millions of books.

## 4. API design principles
- REST-ish resource routes under `app/api`.
- Every handler resolves the current user (`getCurrentUser()`), validates input with Zod, and
  returns a consistent error shape `{ error, details? }`.
- Library responses are always paginated and scoped to the current user (no cross-user reads).
- See [API.md](./API.md) for contracts.

## 5. Frontend architecture
- `app/page.tsx` (Server Component) renders the shell and the client `LibraryView`.
- `LibraryView` owns list/query state, dialogs, and optimistic refresh; presentational pieces
  (`BookCard`, `BookForm`, `LibraryToolbar`, `StatusBadge`, `StarRating`) are reusable.
- A tiny in-repo UI kit (`components/ui/*`) provides button/input/select/dialog primitives so
  we can adopt shadcn/ui components incrementally without a hard dependency yet.
- Mobile-first: the dialog is a bottom sheet on small screens; the grid scales 2→6 columns.

## 6. AI integration (planned)
`lib/ai/recommendations.ts` and `lib/ai/insights.ts` expose stable typed contracts
(`BookRecommendation[]`, `ReadingInsight[]`). The live implementation will:
1. Aggregate the user's library (genres, authors, ratings, pace) into a compact prompt.
2. Call the Anthropic API — default `claude-opus-4-8` for quality, a cheaper model for bulk /
   background passes — requesting **structured JSON** matching the existing interfaces.
3. Validate the model output with Zod before returning.

Because callers depend only on the interface, wiring the model is additive — no refactor.

## 7. Performance & scalability
- Indexes on `UserBook(userId)`, `UserBook(userId, status)`, `Book.isbn13`, `Author.name`,
  `Book.title` (see ERD).
- Pagination on every list endpoint; default page size 24, hard cap 100.
- Cover images lazy-loaded; remote image hosts allow-listed in `next.config.mjs`.
- Redis caching is optional and deferred until a measured hot path needs it.

## 8. Security posture (tracked in QA-REPORTS)
- Input validation + type coercion via Zod on all writes.
- All queries scoped by `userId`; ownership checked before update/delete.
- Prisma parameterizes queries (no string-built SQL) → SQL-injection resistant.
- Future: auth (NextAuth), rate limiting, CSRF considerations, secret management.
