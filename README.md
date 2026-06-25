# Book Tracker

An AI-powered personal library and reading tracker — the best ideas from **BookBuddy + Goodreads + StoryGraph**, reimagined as a modern, fast, mobile-first web app with **no artificial limits**.

> **Status:** Foundation phase. A runnable Next.js + Prisma (SQLite) app with core
> library management (add / edit / delete / search / filter / sort books with reading
> status). Barcode scanning, metadata lookup, analytics, auth, AI, and import/export are
> designed in [`/docs`](./docs) and built in later phases — see [docs/ROADMAP.md](./docs/ROADMAP.md).

## Tech stack

| Layer    | Choice |
|----------|--------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend  | Next.js Route Handlers |
| Database | Prisma ORM + SQLite (Postgres-portable) |
| Auth     | Single local user now; NextAuth + Google later |
| AI       | Designed now, stubbed; Claude API wired later |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Set up the database + sample data (SQLite, zero external setup)
cp .env.example .env          # already contains DATABASE_URL="file:./dev.db"
npx prisma migrate dev --name init
npx prisma db seed

# 3. Run the dev server
npm run dev
# open http://localhost:3000
```

Useful scripts:

```bash
npm run build       # prisma generate + production build (typechecks)
npm run typecheck   # tsc --noEmit
npm run db:studio   # browse the database in Prisma Studio
npm run db:reset    # drop, re-migrate, and re-seed
```

## Project structure

```
app/                 Next.js App Router (pages + /api route handlers)
  api/books/         REST endpoints for the library
components/          React components (BookCard, BookForm, LibraryView, ui/*)
lib/                 Prisma client, validation (Zod), API client, AI stubs, helpers
prisma/              schema.prisma + seed.ts
docs/                Living documentation (PRD, ERD, API, architecture, QA, roadmap)
```

## Documentation

All design and process docs live in [`/docs`](./docs) and are kept current as the
project evolves:

- [PRD.md](./docs/PRD.md) — product requirements & user stories
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — architecture decisions & tradeoffs
- [ERD.md](./docs/ERD.md) — database design & scalability
- [API.md](./docs/API.md) — API contracts
- [ROADMAP.md](./docs/ROADMAP.md) — phased plan
- [QA-REPORTS.md](./docs/QA-REPORTS.md) — QA audits
- [CHANGELOG.md](./docs/CHANGELOG.md) — change log
- [adr/](./docs/adr) — architecture decision records
