# ADR-0001 — SQLite for local development

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Agent 1 (Architect), confirmed with product owner.

## Context
The spec calls for PostgreSQL. Postgres requires a running server (local install, Docker, or a
cloud account). The immediate goal is a runnable foundation on a Windows machine with zero
external setup, while not painting ourselves into a corner for production scale (100k+
books/user).

## Decision
Use **Prisma + SQLite** for local development. Keep the schema **Postgres-portable**:
- no native `enum` types (use constrained `String` + app-side validation),
- no scalar arrays (model lists as relations / join tables).

Switching to Postgres for production means changing the datasource `provider` + URL and
re-generating migrations — no model rewrite.

## Consequences
- ✅ Instant local start; no Docker/account needed.
- ✅ Schema runs unchanged on Postgres later.
- ➖ No DB-level enum constraints or array columns now.
- ➖ Search uses LIKE (no full-text/relevance) until Postgres + full-text in Phase 7.

## Alternatives considered
- **Local Postgres via Docker** — closest to prod, but adds setup friction now.
- **Supabase free tier** — hosted Postgres now, but requires an account + connection string.
