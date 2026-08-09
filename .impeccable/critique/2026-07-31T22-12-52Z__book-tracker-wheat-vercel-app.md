---
target: the whole Book Tracker app
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-07-31T22-12-52Z
slug: book-tracker-wheat-vercel-app
---
Method: dual-agent (A: a0b166038316280e2 · B: ac469d2660e21dd58)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Library/Calendar/Stats show a bare "Loading…" for 3-4s with no progress cue; book covers ("Split," "The Tipping Point") intermittently render blank on first paint then self-correct — likely the same root cause as the hydration error caught in console (see below) |
| 2 | Match System/Real World | 4/4 | Plain, warm, literary language throughout ("Currently Reading," "Streak," "Keep going") — no jargon |
| 3 | User Control and Freedom | 2/4 | Book Detail has no edit/delete affordance at all — only "Start reading session" under the progress dropdown |
| 4 | Consistency and Standards | 4/4 | Shared primitives (Card, SegmentedTabs, ListRow, tinted Stat icons) look and behave identically across every screen |
| 5 | Error Prevention | 3/4 | Native pickers, mood dropdowns, confirm-on-destructive per MASTER.md; not stress-tested live this run |
| 6 | Recognition Rather Than Recall | 4/4 | Desktop nav is icon+label; Continue Reading / Recent Notes surface state without requiring memory |
| 7 | Flexibility and Efficiency | 2/4 | No keyboard shortcuts; no bulk actions in Library; Home customizer is the one power-user win |
| 8 | Aesthetic and Minimalist Design | 3/4 | Individual cards are calm, but the default Home stacks 7-8 sections before any scroll |
| 9 | Error Recovery | 3/4 | Design system commits to inline errors near their cause; not directly observed this run |
| 10 | Help and Documentation | 2/4 | A "Help & Support" row exists in Profile; contents not verified this run |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

**LLM assessment (Assessment A):** This is clearly authored for this exact product, not a re-skinned template. The Cormorant Garamond serif headings over Inter body, the warm-parchment light theme genuinely swapping to a distinct midnight-ink dark theme, the reading heatmap rendering in a dedicated green ramp while every button/link/progress-bar stays blue (matching MASTER.md's "never blue" rule exactly), and literary copy ("Every page you read today is a step forward") together read as bespoke, not generic. The Home dashboard's card taxonomy (streak, continue-reading, goal ring, calendar, insights) is built around this product's specific data model — it would need real rework to serve a different domain.

**Deterministic scan (Assessment B):** `node detect.mjs --json app components` — exit 0, **0 findings** across both `app/` and `components/`, verified by re-running each directory independently to rule out a silent early exit. No `.impeccable/critique/ignore.md` filtered anything; this is a genuinely clean mechanical pass, not a masked one.

**Visual overlays:** Injection did not succeed — not a false positive to explain away, a real tooling/environment mismatch. The deployed app is HTTPS-only (Vercel); the bundled `live-server.mjs` only serves plain HTTP with no TLS option. Chrome silently blocks the resulting `<script src="http://localhost:8400/...">` as mixed active content — the request sits at `pending` forever, never surfacing as a console error. Assessment B confirmed this is the actual cause (verified `localhost:8400/detect.js` itself returns HTTP 200 and is valid source; the failure is specifically the cross-scheme injection into the HTTPS tab) and confirmed a same-context `eval` workaround was blocked only by the 256KB file-read ceiling on the detector source (341.9KB), not by policy. No user-visible detector overlay is available this run. **Incidental finding, not part of the intended scan:** while probing, Assessment B's console read caught a live, reproducible React error on the Home route — **minified React error #418**, a hydration mismatch (server-rendered text didn't match the client on first paint). This lines up with Assessment A's independently-noticed symptom of book covers ("Split," "The Tipping Point") rendering blank on first paint and self-correcting shortly after — two different methods surfacing what is very likely one real bug.

## Overall Impression

Book Tracker is a genuinely well-executed, specific piece of design — the theme system, the heatmap/primary-color discipline, and the shared primitive system are all doing real work, and the mechanical scanner found zero anti-patterns. The gap isn't craft, it's two structural things: **Book Detail is under-powered relative to how central it is** (no edit/delete from the page a reader spends the most time on per book), and **the default Home view is denser than the product's own stated "calm over dense" principle allows** — the fix (the Home customizer) already exists in the codebase, it's just not the default. The hydration error is the one concrete bug worth chasing before anything cosmetic.

## What's Working

1. **The theme system is real, not decorative.** Toggling to midnight-ink dark instantly re-themed every surface — cards, borders, chart bars, heatmap greens — with zero mixed-theme artifacts. Disciplined token usage paying off.
2. **The heatmap/blue-primary separation is executed exactly as specified.** The green contribution-style calendar and the blue interactive primary never bleed into each other anywhere they were checked — a small rule, consistently applied, that makes "session tracking is the core loop" legible at a glance.
3. **Empty-state copy is genuinely on-brand.** "No notes yet — Add highlights, quotes, and thoughts as you read" is warm, specific, and never fabricates data — living up to the product's own "no fabricated data" rule in the UI copy itself, not just the backend.

## Priority Issues

**[P1] Likely hydration mismatch causing blank-cover flash on first paint**
Why it matters: a live, reproducible React error #418 (hydration mismatch) fired on the Home route console; independently, book covers were observed rendering blank on first paint before self-correcting. These are almost certainly the same defect seen from two angles — a real, user-visible flicker on the app's most-visited page, not a cosmetic nit.
Fix: reproduce with React dev-mode error overlay (or `NODE_ENV=development`) to get the specific component/mismatch, then align server- and client-rendered output for whatever text/conditional is diverging (likely a client-only value — a relative date, a candidate-cover URL, or theme-dependent text — rendering server-side before hydration).
Suggested command: `/impeccable audit`

**[P1] No edit/delete path from the Book Detail page**
Why it matters: a reader who opens a book to fix its status or catches a wrong edition has no in-page way to act — the progress dropdown's only option is "Start reading session." They must navigate back to Library, find that exact card, and use its kebab. For a tracker whose whole point is status changes, this is friction on a core, frequent action.
Fix: surface Edit/Delete directly on the Book Detail header (kebab next to "Update Progress"), matching the affordance Library cards already have.
Suggested command: `/impeccable clarify`

**[P1] Mobile bottom nav omits Reading Session, Library, Calendar, and Statistics**
Why it matters: `AppShell.tsx`'s mobile nav is hard-coded to exactly 4 items — Home, Notes, Collections, Profile. PRODUCT.md states "reading consistency is the core loop... not an afterthought," yet the platform where sessions are most plausibly started in the moment (phone, one-handed, mid-read) has no session entry point in its thumb-reachable tab bar.
Fix: swap a lower-value tab (Notes or Collections, both reachable from Home) for Reading Session, or anchor a persistent "start session" affordance to the existing floating `ReadingTimer` on mobile.
Suggested command: `/impeccable shape`

**[P2] Default Home density contradicts the app's own "calm over dense" principle**
Why it matters: 7-8 simultaneous sections stack before any scroll, against Product Principle #2 ("a reading tool should feel like a quiet reading room, not a spreadsheet"). The `HomeCustomizer` already exists to fix this but ships with everything visible by default.
Fix: ship a leaner default section set (streak + continue-reading + quick actions + calendar) and let readers opt into KPIs/insights/shelves via the customizer that's already built.
Suggested command: `/impeccable distill`

**[P2] No bulk actions in Library**
Why it matters: status changes and deletes are one book at a time. For a reader actively maintaining a durable record, re-triaging a backlog (e.g. marking several old Want-to-Reads as Did Not Finish) means opening each book individually.
Fix: add multi-select in the Library grid/list with bulk status-change and bulk-delete.
Suggested command: `/impeccable clarify`

**[P3] Loading state feels generic against the rest of the polish**
Why it matters: plain "Loading…" text (Calendar, Stats, a lingering Library skeleton) reads as unfinished next to the rest of the product's calm, considered feel.
Fix: use the existing skeleton pattern consistently instead of falling back to bare text.
Suggested command: `/impeccable polish`

## Persona Red Flags

**Alex (Power User):** No keyboard shortcuts anywhere. Editing/deleting a book is buried on the page the user is already looking at (P1 above) rather than one click away. No bulk actions in Library — triaging 10 books to update status is 10 separate flows. The one power-user win: Home is genuinely customizable (section hide/reorder), just not defaulted well.

**Casey (Mobile):** The bottom tab bar — what Casey actually uses one-handed — doesn't contain Reading Session, Library, Calendar, or Statistics (confirmed in source: `AppShell.tsx`'s mobile nav is Home/Notes/Collections/Profile only). For a product whose stated core loop is logging reading sessions, that's the single most reachable surface on the device where sessions are most likely to start, and it has no session entry point.

**Sam (Accessibility):** Desktop nav is correctly icon+label, and MASTER.md documents an audited `aria-label` pass, focus rings, and reduced-motion support — nothing observed contradicted that. Neither assessment independently drove the app keyboard-only or with a screen reader this run, so treat this as a documented-but-not-live-verified pass.

## Minor Observations

- "Random Book" quick-action tile renders visibly disabled on Home with no tooltip explaining why — a small visibility-of-system-status gap.
- The seeded account showed 0 Collections and 0 Notes in Assessment A's pass despite a "TBR" collection existing earlier in this session's history — likely just account/session state drift between passes, not a persistence bug, but worth a quick sanity check if it recurs.
- Neither assessment's `resize_window` tool call actually changed the browser viewport this run (confirmed innerWidth stayed at desktop width after repeated attempts) — a session tooling limitation, not evidence about the app's mobile layout itself. Genuine mobile-viewport verification is still outstanding.

## Questions to Consider

- If "reading consistency is the core loop" is a stated product principle, should the mobile bottom nav be built around that loop (Session, Calendar) instead of around Notes/Collections?
- Book Detail is the page a reader spends the most time on per book — why does it currently have less control than the Library card that links to it?
- Is the fully-loaded Home dashboard actually the right default, or is it optimizing for "everything visible" at the cost of the "quiet reading room" feeling the brand is built on?
