# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A **small private circle** — the owner plus a handful of invited readers (invite-only closed beta,
real per-user accounts via email + password, all data scoped per user). The primary user is a
**reader keeping their own honest record of what they read** — logging books and reading sessions,
jotting notes, and watching their consistency over time. Used both on desktop (a full sidebar
dashboard) and on phone (top bar + bottom tab nav). Not public, not solo-only; not a social network.

## Product Purpose

A **calm, private, all-in-one reading companion**. It lets a reader manage their library, log
reading sessions (a live timer or a manual entry), keep notes and highlights per book, set a yearly
reading goal, and see their reading consistency and statistics over time. Success is the reader
maintaining a durable, truthful record of their reading and building a steady habit — with no ads,
no feed, and no social pressure.

## Positioning

**The anti-Goodreads.** The meaningful, hard-to-copy combination is *session-level reading tracking*
(a timer, streaks, mood, and a GitHub-style reading heatmap) fused with *calm personal library
management*, kept **entirely private** — no social graph, no reviews-for-strangers, no ads, no feed.
Neighboring products either socialize reading (Goodreads/StoryGraph) or focus on session mechanics
alone (Bookmory); Book Tracker unifies library, sessions, notes, goals, and statistics in one quiet,
private place.

## Operating Context

A web app (Next.js App Router). Core workflows:

- **Add books** — manually, via free-text metadata search, or by scanning a barcode.
- **Read** — start a live reading session (timer / focus mode) or log a past session, with pages
  and mood.
- **Reflect** — take typed notes and highlights per book; rate and favorite.
- **Organize** — into shelves and collections (named, themed book groups).
- **Set goals** — a yearly books goal with progress and pace.
- **Review** — a calendar-year reading heatmap, plus statistics (books, pages, time, streaks,
  genres, authors) with year-over-year comparisons.

Invite-only beta with an in-app feedback channel and an admin dashboard. Deployed on free-tier infra.

## Capabilities and Constraints

**Capabilities:** library with reading statuses (Want to Read / Currently Reading / Read / On Hold /
Did Not Finish), ratings, favorites, and progress; reading sessions (timer + manual, mood, pages);
a GitHub-style green reading-heatmap calendar (per calendar year); yearly reading goals; typed
notes/highlights; collections and shelves with per-group themes (image/icon/color); statistics
(this-year totals, YoY deltas, current & longest streak, genre/author breakdowns); book metadata
search and barcode scanning; JSON data export; per-user auth; beta feedback + admin tooling.

**Durable constraints (confirmed commitments):**
- **Dependency-light / free-tier.** Reach for a library only where hand-rolling stops paying off,
  and keep the cost on the route that needs it. Runs on Vercel Hobby + Neon free tier (Vercel Blob
  for uploaded images). Restraint is treated as a feature, not a limitation.
  - The **reading heatmap and calendar remain hand-rolled SVG/CSS** — they're the product's
    signature surface and carry bespoke interaction; no library replaces them.
  - **Statistics** (`/profile/stats`) uses **recharts** for its bar and line charts and
    **@number-flow/react** for animating counters. Adopted deliberately; the ~122 kB lands on that
    one route's chunk and the shared bundle is unaffected.
  - This bullet previously read "no charting or animation libraries," which the code no longer
    matched — corrected rather than left as a constraint nothing enforced.
- **Private, no social.** Single-user data scoping; no social feed, public reviews, or
  sharing-by-default.
- **Three-theme identity.** Light ("warm parchment"), Dark ("midnight ink"), and Forest are
  permanent, CSS-variable-driven themes every surface must support.

**Stack:** Next.js 15 (App Router) · TypeScript · Prisma ORM over PostgreSQL (Neon) · TanStack Query
v5 · Zod · hand-rolled HMAC session cookies · Lucide icons · Vercel Blob.

**Terminology:** "shelves" and "collections" are both named book groups; "reading session"; "streak";
the status set above.

## Brand Commitments

- **Name:** Book Tracker.
- **Type:** Cormorant Garamond (serif display, `.font-display`) + Inter (body). Editorial-serif
  headings over a neutral sans is a deliberate, literary pairing.
- **Voice:** warm, calm, literary, premium; encouraging without being loud.
- **Reading heatmap** uses a dedicated GitHub-style **green** intensity ramp, independent of the
  blue interactive primary — green in every theme, never blue.
- **No fabricated data or features** — a standing rule: never invent stats, records, reviews, or
  functionality without a real backend signal; show an honest "—" or build the real thing.

## Evidence on Hand

- A working, continuously-deployed app (this repository) — the incumbent visual + functional truth.
- A real, user-submitted **feedback** system (no synthetic testimonials).
- A maintained design system at `design-system/book-tracker/MASTER.md` (tokens, primitives, heatmap
  rules, accessibility).
- **No** real customer counts, ratings-from-strangers, benchmarks, pricing, or press exist — future
  work must not fabricate any of these.

## Product Principles

1. **Private and honest.** No social, no ads; never fabricate data or features — surface the real
   signal or nothing.
2. **Calm over dense.** A reading tool should feel like a quiet reading room, not a spreadsheet.
3. **Dependency-light craft.** Free-tier infra, and hand-rolled SVG/CSS wherever the surface is
   part of the identity (heatmap, calendar); a library only where it clearly beats hand-rolling,
   scoped to the route that needs it.
4. **Reading consistency is the core loop.** Sessions, streaks, and the heatmap are the heart of the
   product, not an afterthought.
5. **One coherent system.** Reuse shared primitives and the three-theme token system across every
   surface; consistency is the polish.

## Accessibility & Inclusion

Theme-aware contrast across light/dark/forest; keyboard-reachable interactions with visible focus;
`aria-label`s on icon-only controls; `prefers-reduced-motion` respected; a minimum type-size floor
(no sub-10px labels); a skip-to-content link. These are codified in the design-system doc and are
expected of every new surface.
