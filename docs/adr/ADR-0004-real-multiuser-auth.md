# ADR-0004 — Real multi-user auth, retiring the shared APP_PASSWORD

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** Agent 1, confirmed with the product owner.
- **Supersedes:** ADR-0002 (single-user-now) — this is exactly the migration that ADR-0002
  anticipated: *"Phase 2: add real auth, map session → user id, keep the `getCurrentUser()`
  signature. Existing `userId`-scoped queries... become meaningful with no structural change."*

## Context
The app needed to support a closed beta of ~30 real testers. Until now, everyone shared one
`APP_PASSWORD` and every request resolved to a single hardcoded user row. Real registration,
a per-tester account, and a hard 30-user cap require actual per-user identity.

## Decision
Extend the existing hand-rolled HMAC session cookie (`lib/session.ts`) rather than adopt
NextAuth — consistent with every other framework choice in this app (custom UI kit instead of
shadcn, hand-rolled charts instead of Recharts, raw `$queryRaw`/`groupBy` instead of an ORM
analytics layer). The session payload changed from a constant string to `{ userId, exp }`
(base64url JSON + HMAC signature); `lib/user.ts`'s `getCurrentUser()` now resolves the real
logged-in user from that cookie instead of a hardcoded email, with its signature unchanged so
every existing call site needed zero changes. Passwords are hashed with `bcryptjs` (pure-JS,
no native bindings, safe on Vercel).

The single account auto-bootstrapped by the old shared-password model (which already owns the
live production library) was migrated via a one-time `/migrate` page: enter the old shared
password once, set a real email + personal password. `APP_PASSWORD` is then fully retired —
keeping it as a second outer gate was considered and rejected, since anyone holding it could
already self-register, defeating the cap and per-user accountability the new system exists to
provide.

Admin access is granted via an `ADMIN_EMAILS` env var, checked at registration, login, and
migration (not a DB-only flag, which would have no way to grant the very first admin).

The 30-user cap (`MAX_BETA_USERS`) is enforced with a count-then-create inside one
`$transaction` — a deliberate, documented **best-effort** mitigation, not full row-locking.
At ~30-user scale, the realistic worst case of simultaneous registrations right at the cap is
31-32 users, not a real problem; true correctness would need locking hints disproportionate to
the actual risk here.

## Consequences
- ✅ Real per-user accounts, with zero structural change to any existing `userId`-scoped model
  or query — confirmed, every user-owned table already had a correct FK.
- ✅ No new auth framework/dependency beyond `bcryptjs` (unavoidable — no hashing library
  existed before).
- ✅ The existing production library and its owner are preserved exactly, just re-keyed to a
  real account via the one-time migration.
- ➖ No self-service password reset (mitigated with a "email the admin" line on the login page —
  acceptable at 30-user scale, revisit if it becomes a real pain point).
- ➖ The beta-cap race condition is a known, accepted residual risk, not eliminated.

## Alternatives considered
- **NextAuth** — more battle-tested, but replaces rather than extends the existing session
  code, and adds its own config/adapter surface disproportionate for 30 users.
- **Keep `APP_PASSWORD` as an extra outer gate** — rejected; no real defense-in-depth benefit,
  confusing second prompt for testers never given the shared password.
