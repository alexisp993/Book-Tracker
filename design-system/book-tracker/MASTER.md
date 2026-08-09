# Book Tracker — Design System (Master)

> **LOGIC:** When building a specific page, first check `design-system/book-tracker/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. If not, follow the rules below.

**Project:** Book Tracker — single-user reading tracker, closed beta
**Stack:** Next.js 15 App Router · TypeScript · Tailwind · Prisma/Postgres · TanStack Query v5 · Lucide
**Constraint:** No charting or animation libraries. All charts are hand-rolled SVG/CSS. Keep it that way.

> Regenerated from the actual codebase. The previous version of this file was generic template
> output describing a monochrome `#18181B` / Libre Baskerville **landing page** — a product that
> was never built. Every value below is quoted from `app/globals.css`, `tailwind.config.ts`,
> `app/layout.tsx`, and `components/ui/`.

---

## 1. Color tokens

Themes are **classes on `<html>`** (`.dark`, `.forest`), applied pre-paint from
`localStorage["bt_theme"]`. Consumed as `hsl(var(--x))`.

**"Bound"** — the palette comes from the materials a book is made of: the text
block (paper), the binding (cloth), the stamp (foil), and ink. Light is the
open page; Dark is the same book closed, bound in navy cloth; Forest is the
green-cloth binding. The greyer paper is deliberate — cream plus a serif is
the reflexive "book app" look, and the grey is what makes this read as a
printed object rather than parchment.

| Token | Light (text block) | Dark (navy cloth) | Forest (green cloth) |
|---|---|---|---|
| `--background` | `40 14% 92%` | `220 20% 8%` | `156 24% 7%` |
| `--foreground` | `25 14% 13%` | `40 18% 94%` | `96 14% 92%` |
| `--card` | `40 22% 97%` | `220 16% 13%` | `156 19% 12%` |
| `--primary` | `219 52% 33%` | `214 68% 63%` | `146 40% 55%` |
| `--secondary` / `--muted` / `--accent` | `38 13% 87%` | `220 14% 17%` | `156 16% 16%` |
| `--muted-foreground` | `28 8% 40%` | `35 9% 66%` | `100 9% 64%` |
| `--border` | `36 12% 83%` | `220 13% 20%` | `156 14% 20%` |
| `--input` | `36 12% 78%` | `220 13% 23%` | `156 14% 23%` |
| `--ring` | `219 52% 33%` | `214 68% 63%` | `146 40% 55%` |
| `--warm` (brass foil) | `32 62% 44%` | `34 72% 58%` | `34 68% 55%` |
| `--destructive` | `4 62% 44%` | `4 66% 60%` | `6 68% 64%` |
| `--radius` | `0.85rem` | *(inherits)* | `1rem` |

> **The format of these values is load-bearing.** They must stay bare,
> space-separated HSL triples, and `--heat-*` must stay plain hex. Two
> consumers hand-parse them: `tailwind.config.ts` wraps each as
> `hsl(var(--x))`, and `readThemePalette()` in `CalendarView.tsx` splits the
> triple to build the calendar PNG. Canvas silently ignores an invalid
> `fillStyle` and keeps the previous colour, so a format change there produces
> a quietly wrong export that no build step can catch.

> Forest's `--destructive` is lighter than the other themes' on purpose: at the
> shared value it measured 4.14:1 on Forest's card, under the AA floor.

> `--heat-1..4` are a fixed brand commitment (green in every theme, never
> blue). `--heat-0` is **not** part of that ramp — it is the empty cell, and is
> re-derived per theme to sit on that theme's ground.

**Rules**

- Never hardcode a hex or a raw Tailwind palette color (`bg-blue-500`) for structural UI.
- The one sanctioned exception is the **semantic accent set** used for stat tints and status
  colors (`amber / emerald / teal / violet / rose / blue`), centralized in `TINTS`.
- `--warm` is reserved for streak / motivational surfaces.
- There are no `--space-*` tokens. Use Tailwind's scale.
- **`--shadow-1/2/3` are real tokens**, defined per theme in `globals.css` and exposed
  as `shadow-card` / `shadow-card-hover` / `shadow-cover` via `tailwind.config.ts`.
  Dark and forest use much higher alphas — a shadow has little to darken on a dark
  background, so depth there also relies on `--card` sitting well above `--background`.

### Radius derives from `--radius` (fixed in Phase 2)

`tailwind.config.ts` maps `2xl / xl / lg / md / sm` to `var(--radius)` derivatives, so a theme can
actually change the app's roundness. Offsets were chosen so light/dark render identically to the
old stock values; only Forest changes. Verified in-browser:

| Theme | `--radius` | `rounded-xl` | `rounded-2xl` |
|---|---|---|---|
| Light / Dark | `0.85rem` | 12px | 16px |
| Forest | `1rem` | 14.4px | 18.4px |

`rounded-full` stays `9999px` and is not tokenized.

---

## 2. Typography

- **Body:** Inter — `--font-sans`, variable, `display: swap`
- **Display:** Literata — `--font-serif`, variable axis, exposed via the
  hand-written `.font-display` class in `globals.css` (**not** a Tailwind `fontFamily` key)

Editorial serif display + neutral sans body is the right pairing for a reading app. Keep it.

Literata replaced Cormorant Garamond. Cormorant is a *display* face — small
x-height, hairline strokes — and most titles in this app render at 13–15px,
where it went weak and generic. Literata was drawn for long-form book reading
and holds weight small. Two consequences to respect:

- **Display weight tops out at `font-semibold` (600).** Literata's 700 is
  markedly blacker than Cormorant's; page titles use 600, not bold.
- **`.font-display` sets no letter-spacing.** The old blanket `-0.01em` was
  tuned for Cormorant's loose fit and crowds Literata at small sizes. Apply
  `tracking-tight` at the call site for ~24px and above; leave small titles
  alone.

| Role | Class |
|---|---|
| Screen title | `font-display text-2xl font-semibold tracking-tight` |
| Card / section title | `font-display text-lg font-semibold` |
| List / card-row title | `font-display text-title-sm font-semibold leading-tight` (15px — a real gap between `text-sm`/14px and this row, found via `/impeccable typeset`: 8 files had independently converged on the identical arbitrary `text-[15px]`, so it's named as `fontSize.title-sm` in `tailwind.config.ts` rather than left a magic number) |
| Body | `text-sm` |
| Secondary / caption | `text-xs text-muted-foreground` |
| Dense secondary (metadata rows, shelf captions) | `text-caption-sm` (11px — same story as `title-sm`: 26 call sites had converged on `text-[11px]`, now `fontSize.caption-sm`) |
| Micro (legend, axis) | `text-[10px]` — **hard floor** |

`text-[8px]` and `text-[9px]` are **banned**. If labels don't fit, show *fewer labels* — don't
shrink the type. (That's exactly why the heatmap weekday axis labels only Mon/Wed/Fri.)

---

## 3. Spacing, radius, elevation

- Card padding `p-4 sm:p-5` · list-row padding `px-4 py-3` · card gap `gap-3` · section gap `space-y-6`
- Radius: `2xl` = cards/containers · `xl` = rows, buttons, popovers · `full` = pills, avatars, badges
- **Depth = elevation + surface + border.** Surfaces stack `bg-background` → `bg-card`
  → `bg-muted`; cards carry `shadow-card` on top of their border. Border alone read as
  flat, which is what this rule previously mandated — it was reversed deliberately.
- **Interactive surfaces lift**: `hover:shadow-card-hover hover:-translate-y-px` with a
  `transition-[box-shadow,transform]`. Applies to book cards, list rows, quick-action
  tiles, and collection cards.
- **Book covers use `shadow-cover`** everywhere they appear. Books are physical objects;
  this is the single strongest depth cue in the app.
- Never animate layout properties for elevation — only `box-shadow` and `transform`.
- Shell: **desktop (`lg:`+) uses a fixed ~240px left sidebar** (`AppShell`), content offset by
  `lg:pl-60` inside `max-w-[1600px] mx-auto`. Below `lg:` it's the sticky top bar + fixed 4-tab
  bottom bar. Page content still uses `px-4 sm:px-6 lg:px-8`.
- The Home page is a **config-driven dashboard grid** (`lg:grid-cols-6`, `grid-auto-flow: row
  dense`); each section declares a `SECTION_SPAN` (`lib/homeConfig.ts`) and the grid reflows when
  the customizer hides/reorders sections.

---

## 4. Primitives

All primitives live in `components/ui/`. **Never hand-roll these patterns again** — import them.

| Primitive | File | Spec / API |
|---|---|---|
| `Button` | `ui/button.tsx` | variants `default\|outline\|ghost\|destructive` × sizes `default\|sm\|icon` |
| `Input` `Textarea` `Select` `Label` | `ui/input.tsx` | native passthrough, no variants |
| `Dialog` | `ui/dialog.tsx` | Escape to close, scroll-lock, bottom sheet under `sm` |
| `Card` | `ui/card.tsx` | `rounded-2xl border bg-card p-4 sm:p-5`; `title` optional; pass layout via `className` (it merges). **A bounded object**, not every titled region — see the Card/Section rule below |
| `Section` | `ui/section.tsx` | A labelled region: heading + optional subtitle + optional trailing action, with **no** border, background, shadow or padding. `Card` composes its header so the two can't drift |
| `CoverFrame` | `BookCover.tsx` | The framed box a cover sits in, at one of `xs / sm / md / lg / xl / fill`. Radius scales with the box; every size carries `shadow-cover` |
| `Stat` | `ui/stat.tsx` | tinted icon badge + value + label |
| `ListContainer` / `ListRow` | `ui/list.tsx` | row `px-4 py-3`, icon `h-4 w-4` (Lucide component, not a node), `ChevronRight h-4 w-4` |
| `SegmentedTabs` | `ui/tabs.tsx` | `rounded-xl bg-muted p-1`; active `bg-card shadow-sm` |
| `FilterPills` | `ui/tabs.tsx` | `rounded-full px-3.5 py-1.5`; active `bg-foreground text-background`. `size="sm"` = secondary refinement row |
| `BarRow` | `ui/bar.tsx` | label + `h-2.5` track + count |
| `ProgressBar` | `ui/bar.tsx` | `h-2 rounded-full` — one height everywhere |
| `PageHeader` | `ui/page-header.tsx` | the screen title; see ownership rule below |
| `BackHeader` | `ui/page-header.tsx` | `<Link>` back affordance + optional `PageHeader` |
| `Pagination` | `ui/pagination.tsx` | `page / totalPages / onChange / disabled`; renders nothing for 1 page |

`TINTS` lives in `lib/constants.ts`.

### Title ownership

**`page.tsx` owns the screen title via `PageHeader`.** This is deliberate: several views
early-return on loading/empty (`MyFeedbackView`, `BetaDashboardView`, `StatsView`), so a title
placed *inside* the view disappears in exactly the states where the user most needs to know where
they are. Keeping it in `page.tsx` guarantees it always renders.

The exception: views whose title row contains view-owned controls (`LibraryView`'s search toggle,
`NotesView`'s search/add, `StatsView`'s period label) keep the title inside — and those views must
render the header in **every** state, including loading and empty.

---

## 5. Visual hierarchy

1. **`Card` for bounded objects; `Section` for labelled regions.** If the
   content is something you could pick up and move — one book's
   continue-reading tile, a note, a chart — it's a Card. If it's a labelled
   part of the page — a shelf of covers, a row of metrics, a group of action
   tiles — it's a Section. A border around everything ranks nothing: uniform
   elevation is why this app's hierarchy previously rested entirely on type
   size. **Never nest a Card inside a Card.**
2. **Covers are the hero.** A book cover is the most designed object on any
   screen it appears on, and should generally be the largest. Size it with
   `CoverFrame`; don't hand-roll a box. Resist stacking badges, pills and
   metadata onto the artwork.
3. **One H1 per screen** via `PageHeader`. Never two competing titles.
4. Numbers lead in stat contexts: value `text-2xl`+ first, label `text-xs muted` second.
5. Color carries meaning, never decoration — `primary` = interactive/progress, `warm` = streaks,
   `destructive` = irreversible, accent tints = category identity only.
6. **Max one primary filled button per view.** Everything else `outline` or `ghost`.
7. Chrome recedes: nav / toolbars / labels at `muted-foreground`, content at `foreground`.

---

## 6. Interaction

1. Every interactive element: `cursor-pointer`, a hover state, and a visible
   `focus-visible:ring-2 focus-visible:ring-ring`.
2. **Touch targets:** ≥44×44px for primary/standalone actions; **≥36px (`h-9`) with ≥8px
   spacing** for dense secondary controls (icon buttons in card action rows, calendar/heatmap
   nav). WCAG 2.5.8 (AA) sets the hard floor at 24×24px; the 44px figure is AAA/Apple HIG and is
   what anything frequently reached for should hit. Stated with this nuance deliberately — a
   blanket 44px would wreck the density this app depends on, and a rule that's knowingly broken
   everywhere is worse than an honest one.
3. `transition-colors duration-200`. Never animate `width`/`height`/layout. No scale-on-hover in lists.
4. Async actions disable their trigger and show in-place pending text (`"Saving…"`).
5. Destructive actions always confirm.
6. **Never ship a functionless control.** A mockup element with no real behavior is omitted, not
   faked. (Held on the Reading-Session kebab, the Statistics period selector, and Achievements.)
7. Errors render inline next to their cause — never a toast that can be missed.

---

## 7. Heatmap rules — GitHub's contribution graph is the reference

**One component: `components/Heatmap.tsx`.** The Home card, `/sessions`, and `/profile/stats` all
render it (via `ReadingHeatmap`) — they pass data + paging, nothing else. `bucket()` and the color
ramp live only in `lib/calendarViewModel.ts`; never re-declare them (three divergent copies once
made the same 40-minute session read as level 1 on `/calendar` and level 2 on the heatmaps).

| Rule | Spec |
|---|---|
| Layout | **CSS Grid** — one grid holds a weekday gutter column, a month-label row, and the 7×N cells. No fixed pixel widths, no absolute positioning, no `justify-between`. |
| Fill + square | Columns are `minmax(0,1fr)` so the grid **fills its container**; cells are `aspect-square` so height derives from the resolved column width. No dead space on the right. |
| Window | **One calendar year** (Jan 1 → Dec 31 of the selected year), not a rolling 12 months. Arrows step whole years; **Today** → current year. Days from boundary weeks / the future render faded (`opacity-40`). |
| Header | Year label left (`{year}`); nav is **one grouped control** right (`[← Today →]`, a single bordered container). |
| Alignment | Week-aligned columns, **Sunday-first**. Row index = weekday. |
| Month labels | All 12 (Jan–Dec), placed at `grid-column: firstWeekOfMonth+2` (gutter is col 1), above the exact week each month begins; re-align for free as width changes. A `1.5rem` label row leaves a ~12px gap to the grid. |
| Weekday labels | Gutter column, **Mon / Wed / Fri only** (`LABELED_WEEKDAY_ROWS`), `text-[10px]`. |
| Palette | **A dedicated green ramp** — `--heat-0…4` CSS vars in `globals.css`, theme-aware (light/dark/forest), **independent of `--primary`** (which stays blue for actions). `BUCKET_CLASS = bg-[var(--heat-N)]`. GitHub-style green in every theme; **never blue**. |
| Buckets | `0 / ≤30 / ≤60 / ≤120 / >120` min → `BUCKET_CLASS`. |
| Legend | A `Daily Reading` caption over a `Less ▢▢▢▢▢ More` scale, below the grid. |
| Empty | No sessions ever → a friendly "No reading activity yet" message replaces the grid (parent passes `isEmpty`). A year that merely has no data still shows an all-level-0 grid. |
| Today | `ring-1 ring-foreground` (not a heat color). |
| Future days | `bg-[var(--heat-0)] opacity-40`, never interactive. |
| Nav | Prev / **Today** / Next; chevrons `h-4 w-4`; buttons `h-9`. |
| Responsive | Fills on desktop; a `min-w-[760px]` wrapper makes it **scroll on mobile rather than shrink cells** below ~11px. Scrollbar hidden; auto-scroll to newest on mount. |
| A11y | Cells carry `aria-label` (not only `title`); the weekday axis is `aria-hidden`. |

**Canvas export** (`downloadCalendarImage`) reads the same `--heat-*` vars (via `BUCKET_VARS`), so
the exported PNG uses the identical green ramp. Keep that coupling.

**Duration text** always comes from `formatDuration` in `lib/utils.ts` (`"45m"`, `"1h 30m"`).
Do not re-declare it.

---

## 8. Responsive

- Mobile-first. Base = 375px. Only `sm:` (640) and `lg:` (1024) breakpoints — keep it that way.
- Verify at **375 / 768 / 1024 / 1440**.
- Main padding clears the fixed bottom nav (`pb-28 sm:pb-14`); the nav respects
  `env(safe-area-inset-bottom)`.
- **Never allow horizontal page scroll.** Wide content scrolls inside its own `overflow-x-auto`
  container, with `min-w-0` on the flex parent.
- Stat rows `grid-cols-2` → `sm:grid-cols-4`. Card grids `grid-cols-2` → `lg:grid-cols-3`.
- Dialogs are bottom sheets under `sm`, centered modals above.

---

## 9. Performance

- No charting/animation libraries. Shared JS ~102 kB — do not regress it.
- TanStack Query: `staleTime: 60_000` on calendar reads; mutations invalidate explicitly.
- Seed detail views with `placeholderData` from the cached list (`useBook` is the reference).
- **Aggregate server-side** — Prisma `groupBy`/`aggregate`, or a narrow `findMany` + one JS
  reduce. Never fetch-all-then-loop.
- Fetch once and page client-side where the dataset is small and bounded (both heatmaps do this).
- **Images:** raw `<img>` is deliberate — covers come from arbitrary external hosts and need the
  `coverCandidates[]` fallback walk that `next/image` would complicate. All cover images carry
  `loading="lazy"` + `decoding="async"`; they sit inside fixed-size containers, so no explicit
  `width`/`height` is needed to prevent layout shift. (The one exception is `FeedbackForm`'s
  screenshot preview — a local blob that's already in memory, where lazy-loading would be a no-op.)
- Reserve space for async content; a loaded card must not change page height.

---

## 10. Accessibility

| # | Rule | Status |
|---|---|---|
| A1 | Contrast ≥4.5:1 body, ≥3:1 large/UI | Token pairs pass; watch `muted-foreground` on `muted` in Forest |
| A2 | Min type size `text-[10px]` | ✅ enforced |
| A3 | Touch targets (rule in §6.2) | ✅ every real control ≥36px with ≥8px spacing; audited — remaining `h-8`/`h-7` matches are icon glyphs, not targets |
| A4 | `title=` is not an accessible tooltip — pair with an accessible name | ✅ audited. Data-only tooltips now carry `aria-label` (heatmap cells, both stat charts); the `title=` that remain (refresh button, floating timer) sit on controls with visible text, so `title` is supplementary hint text, not the name |
| A5 | Visible focus ring on all interactive elements | ✅ in every primitive (`ListRow`, `SegmentedTabs`, `FilterPills`, `BackHeader`, `Button`) and both stat charts' bars |
| A6 | `aria-label` on every icon-only button | ✅ audited — every icon-only control has one; the rest have visible text |
| A7 | Color never the sole indicator | ✅ heatmap value is carried in the `aria-label` |
| A8 | Logical tab order, no keyboard traps | ✅ dialog handles Escape + scroll-lock |
| A9 | `prefers-reduced-motion` respected | ✅ global rule in `globals.css` |
| A10 | Form inputs have an associated `<label>` | ✅ `Label` primitive used throughout |
| A11 | Skip-to-content link | ✅ in `AppShell`, targets `<main id="main">` |

---

## 11. Pre-delivery checklist

- [ ] No emoji as icons — Lucide SVG only
- [ ] `cursor-pointer` on everything clickable
- [ ] Transitions 150–300ms, `transition-colors` only
- [ ] Light **and** dark **and** forest checked
- [ ] Responsive at 375 / 768 / 1024 / 1440, no horizontal scroll
- [ ] Focus states visible for keyboard nav
- [ ] No duplicated `bucket()`, `formatDuration`, or `formatDate` — import the shared ones
- [ ] `npx tsc --noEmit` + `npx next build` clean
