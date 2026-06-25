# ADR-0002 — Single local user now, multi-user-ready schema

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Agent 1, confirmed with product owner.

## Context
The product is a **personal** library tracker. Full auth (NextAuth + email/password + Google
OAuth) is significant work and requires external credentials before anything is usable. The
fastest path to a working app is to skip login while not blocking multi-user later.

## Decision
Run in **single-user mode**: a fixed local user is resolved on every request via
`getCurrentUser()` (`lib/user.ts`), which upserts one row keyed by a constant email. Every
user-owned table already carries a `userId` foreign key, and all queries are `userId`-scoped.

## Consequences
- ✅ App is usable immediately; no auth setup or secrets required.
- ✅ Adding NextAuth later means replacing `getCurrentUser()` with a session lookup — call
  sites are unchanged.
- ➖ No real authentication/authorization yet; not safe to expose publicly as-is.
- ➖ Ownership checks exist in code but are trivially satisfied until real identities exist.

## Migration path
Phase 2: add NextAuth, map session → user id, keep the `getCurrentUser()` signature. Existing
`userId`-scoped queries and ownership checks become meaningful with no structural change.
