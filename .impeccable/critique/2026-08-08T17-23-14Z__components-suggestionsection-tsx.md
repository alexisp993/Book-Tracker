---
target: book suggestions surface
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-08T17-23-14Z
slug: components-suggestionsection-tsx
---
Method: dual-agent (two isolated sub-agents, run in parallel; A completed before detector output entered synthesis)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | `LibrarySuggestions` returns `null` while loading — the section is an empty void, then pops in. Genre mode shows a spinner. Same file, opposite philosophies. |
| 2 | Match System / Real World | 1 | Books are identified by publisher marketing copy, not title/author/cover. Live result: a card reading `Sams Local 11-7-2004 $35.00.` is *The Dark Tower VII*. |
| 3 | User Control and Freedom | 3 | Dialog cancels cleanly; but a genre pill can't be deselected back to the neutral state. |
| 4 | Consistency and Standards | 2 | Vertical list deliberately *shows* its scrollbar + fade; the genre pill row hides its scrollbar with no fade. `role="tablist"` declared with no `tabpanel`, `aria-controls`, or arrow-key roving. |
| 5 | Error Prevention | 1 | No way to avoid a mistaken add — there is no information on which to base the decision. Identity discovery and commit are the same click. |
| 6 | Recognition Rather Than Recall | 1 | Cover, title, and author recognition — the entire mechanism readers use to evaluate books — is removed by design. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no expand, no sort, no "show titles" escape hatch. ~4 of 20 results visible at a time. |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely restrained and system-consistent. Docked for ragged card heights and a bottom fade washing over a live button. |
| 9 | Error Recovery | 2 | `lookupIsbn` failure silently degrades to partial data with no user signal. "No results" offers no next action. |
| 10 | Help and Documentation | 4 | The two algorithm footnotes are model UX writing — plain, in-place, no tooltip. |
| **Total** | | **21/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**Weak-to-moderate. The logic is Book Tracker's; the card is nobody's.**

**LLM assessment:** What is genuinely specific is the reason vocabulary ("Because you read Fantasy", "Next in a series you started") and the promise that owned books are excluded — both only possible in a product that holds your library. `lib/suggestions.ts` scores against the reader's own history rather than global popularity, which is the anti-Goodreads thesis expressed in code.

What is generic: the card — a full-width rounded rectangle holding a 3-line clamped paragraph with a trailing circular "+" — is the canonical AI suggestion row. Swap the strings and it is a Jira triage list or a support-ticket inbox. Nothing says *book*; nothing says *quiet reading room*.

Two choices actively contradict PRODUCT.md's brand commitments. The stated type identity is Cormorant Garamond over Inter, "a deliberate, literary pairing" — this surface uses **no serif at all**, and its `<h2>` renders at `text-sm`, smaller than the empty-state title beneath it. And the synopsis sets at a ~150-character measure at desktop width, more than double a readable line, on the one surface in the app whose entire content is prose about books.

**Deterministic scan:** Clean. Zero findings, exit 0, across `components/SuggestionSection.tsx`, `components/ui/tabs.tsx`, `components/ui/card.tsx`, and the whole `components lib app` tree. This was verified as a genuine result, not a silent no-op: a synthetic control file with a bounce cubic-bezier correctly produced exit 2 and a `bounce-easing` finding. Detector URL mode is unavailable (puppeteer not installed) and — worth knowing — misleadingly exits 0 with `[]` rather than erroring.

**Visual overlays:** Injection capability was probed and **succeeded** (title mutable, inline `<script>` executed, no CSP block, overlay div laid out). No overlay was left in place, so there is nothing to look at in the browser — the capability was verified, not used for presentation.

## Overall Impression

The engineering underneath this is better than the surface it produces. The scoring model is honest and personal, the footnotes explain themselves without a help icon, and the accessibility plumbing added this session genuinely works — measured, not assumed.

But the surface is built on the single least reliable field in the payload, and real data proves it. Google Books' `description` is not a synopsis field; it is an unvalidated free-text bin. Live results included a price sticker, Accelerated Reader metadata (`Grade level 8.2, Book #123, Points 4.`), MARC boilerplate with `--Provided by publisher` intact, a box-set inventory line, and a 450-word public-domain chapter excerpt clamped mid-sentence. The existing filter only checks that the string is non-empty, so garbage beats the title fallback every time.

The single biggest opportunity is not to abandon the synopsis-led direction — it is to make the card *recoverable*: gate the description on quality, and add a subordinate attribution line so a reader can always tell what they are being offered.

## What's Working

**The algorithm footnotes are model UX writing.** "Ranked by author matches and reader ratings — books you already have are left out." One sentence explains the ranking, sets expectations, and pre-empts "why isn't X here?" — in place, no tooltip. This embodies "private and honest" better than anything else on the surface.

**The accessibility work from this session measurably holds.** Under *real* keyboard focus the "+" button paints a two-layer ring (`0 0 0 2px` background offset, `0 0 0 4px` primary). The `hitArea` pseudo-element measures exactly 44x44 despite a 32x32 box. Composited contrast is 12.71 / 12.18 / 10.24 for the synopsis and 5.30 / 6.71 / 5.47 for the reason label across light / dark / forest — all clear of AA, and the reason-label figures reproduce the source comment's claimed values exactly.

**The scroll affordance is deliberately non-default and documented.** The list opts *out* of auto-hiding scrollbars and adds a fade — two independent "more below" cues for a container with 2743px of content in a 420px window. Most codebases reflexively hide the scrollbar; choosing visibility and writing down why is the right call.

## Priority Issues

### [P0] The synopsis filter makes the whole feature single-provider-dependent, and it silently returns nothing

**What:** Assessment B got **"No results" for Fantasy** — the same genre that returned 18 populated rows earlier in this session — and reported Science Fiction empty on repeat attempts too.

**Why it matters:** This is a regression introduced by the synopsis redesign, and it is mine. `getGenreSuggestions` now filters `!!r.description?.trim()`. Open Library's search response *never* includes a description; only Google Books does. Both providers are wrapped in `.catch(() => [])`. So when Google Books rate-limits, errors, or simply returns thin records, every surviving result is description-less, every one is filtered out, and the user gets a bare "No results" for a genre with thousands of matching books. Before the redesign the same conditions degraded gracefully to Open Library results; now they fail closed. The empty state also gives no diagnostic, so it is indistinguishable from a genuinely empty genre.

**Fix:** Stop treating a missing description as disqualifying. Fall back to the lightweight fields (title + author) for a card that has no usable synopsis rather than dropping the result, or resolve descriptions for description-less results via the existing `lookupIsbn` pipeline. Separately, distinguish "provider returned nothing" from "everything was filtered out" in the empty state.

**Suggested command:** `/impeccable harden`

### [P0] Cards cannot identify the book they recommend, and real data proves it

**What:** The card renders `result.description` and nothing else, with `|| result.title` firing only when the string is *empty*. Live Fantasy results produced `Sams Local 11-7-2004 $35.00.` (*The Dark Tower VII*), `Grade level 8.2, Book #123, Points 4.` (*The Little Prince*), MARC boilerplate, and a mid-sentence chapter excerpt.

**Why it matters:** The design bets 100% of a card's information value on the least reliable field in the payload, and the failure is silent and total. It is also inconsistent in a way that gets the worst of both worlds: several descriptions *do* leak the title (Narnia, Harry Potter), so the surface delivers neither reliable anonymity nor reliable identity.

**Fix:** Keep the synopsis as the card's hero — that direction was an explicit call and it is defensible. But extend the existing filter at `lib/suggestions.ts:233` from a non-emptiness check to a quality gate: reject under ~60 characters, reject price/grade-level/catalog patterns (`/\$\d|Grade level|Points \d|AR (BL|Quiz)/i`), strip `--Provided by publisher.` suffixes. Then add a de-emphasized attribution line — title · author at `text-caption-sm text-muted-foreground` — visually subordinate to the prose.

**Suggested command:** `/impeccable harden`

### [P1] The title is in the DOM as an `aria-label` — sighted users are the only ones denied it

**What:** Every add button carries `aria-label={`Add ${result.title}`}`. Assessment B enumerated the full roster: "Add Harry Potter and the Deathly Hallows", "Add The Dark Tower VII", "Add Graceling".

**Why it matters:** Two consequences. It proves the title costs nothing to display — the omission is purely a rendering choice. And it inverts the usual accessibility asymmetry: a screen-reader user hears the real title while the sighted user beside them sees a price sticker. It is also a WCAG 2.5.3 (Label in Name) failure for voice control — saying "click Add Graceling" targets a button whose visible text contains nothing of the sort.

**Fix:** Resolve the direction rather than keeping the loophole. Showing the title subordinately (per the P0 above) lets the accessible name match what is on screen.

**Suggested command:** `/impeccable clarify`

### [P1] Identity discovery and the commit action are the same click, opening a 10-field form

**What:** The only way to learn what a card is: press "+", which fires `lookupIsbn` and opens a dialog with Title, Author(s), Status, Rating, Current page, Total pages, Publisher, Published, ISBN-13, Cover URL, Description. No cover image renders — only its URL, in a text input. The dialog is titled "Add a book," never the book's name.

**Why it matters:** Error prevention and progressive disclosure both collapse. Browsing 20 results means opening and dismissing 20 modals. There is no read-only middle rung between *zero identity* and *a full editable record*.

**Fix:** Make the card body expand on click to reveal title, author, cover thumbnail, and full synopsis, leaving "+" as the pure commit action. In the dialog, set the title to the book's name and render the cover as an actual image.

**Suggested command:** `/impeccable shape`

### [P2] Genre results are unfiltered for audience, and the pill row discards personalization the app already computes

**What:** "Fantasy" returned *Where the Wild Things Are*, *Winnie-the-Pooh*, *The Little Prince*, and *Casanova's "Icosameron"* — roughly a third picture books or 18th-century curios. Separately, `buildUserProfile` computes `top3Genres` and `getGenreSuggestions` never uses it; the 14-pill row is a static alphabet with no default.

**Why it matters:** The scoring function has no maturity or page-count signal, so keyword density lets children's classics win an adult-fantasy query. And the one personalized thing this surface could do — lead with the reader's own top three genres — is computed and thrown away, on the surface best placed to deliver the anti-Goodreads promise.

**Fix:** Penalize `pageCount < 100` and juvenile category signals unless the genre is "Young Adult". Sort `GENRE_ITEMS` so the reader's top three lead, and default-select the first so the surface arrives with content instead of a third empty state.

**Suggested command:** `/impeccable shape`

### [P2] Touch targets, affordance drift, and dark-theme contrast on the one action

**What, four measured items:**
- The 2 segmented tabs (95x32, 85x32) and all 14 genre pills (61–111 x 32) are **32px tall with no `hitArea`** — the one touch-target finding that is real and unmitigated. The "+" buttons are fine (true 44x44 via pseudo-element).
- The bottom fade is `pointer-events-none` but paints over the last visible card's live "+" button.
- In dark theme the "+" is `bg-muted` on `bg-card` — the only action on the card has the weakest surface contrast on it, in the theme the product calls "midnight ink."
- `SegmentedTabs` declares `role="tablist"`/`role="tab"` with no `tabpanel`, no `aria-controls`, no arrow-key roving tabindex.

**Fix:** Give the pill row and tabs real height or a safe hit area. Inset the fade to clear the button column. Give "+" a border or `bg-secondary` for dark. Either complete the tablist ARIA contract or drop to `aria-pressed` buttons, as `FilterPills` already does correctly.

**Suggested command:** `/impeccable adapt`

## Persona Red Flags

**Jordan (confused first-timer) — most damaged.** Lands on `/collections`, sees "No collections yet" and "No suggestions yet" as two visually identical dashed voids stacked in a column, switches to By Genre, gets a *third* empty state behind 14 unranked pills, picks Fantasy — and on Assessment B's run gets a *fourth* ("No results"). On the run that did return data, the second card read `Sams Local 11-7-2004 $35.00.` Jordan's most reasonable conclusion is that the feature is broken. There is no title to anchor on and no cover to recognize; the only way to investigate is a button that looks like it will add something. Jordan will not press it.

**Alex (impatient power user) — badly served.** Alex's entire scanning strategy is author-and-title recognition at speed, the fastest signal in book discovery, and it is unavailable. Alex must read three lines of publisher marketing prose per card at a 150-character measure across 20 cards to do what a cover grid does in two seconds — and will unknowingly re-open the same book twice, because there is no title to remember it by.

**Sam (screen reader + keyboard) — mixed, with a real gap.** Sam gets the *best* deal on identity: every "+" announces the real title, and the focus ring genuinely works under keyboard input. But `role="tablist"` implements no arrow-key navigation, so Sam's expected keys do nothing; there is no `tabpanel` relationship signalling that switching modes changed the content below; and the results have no list semantics or count, so Sam cannot tell whether this is 3 books or 20. In My Library mode the row is a `Link` whose accessible name is the *entire* clamped description paragraph — Sam's link list reads as walls of publisher copy with no titles at all, the exact inverse of genre mode.

## Minor Observations

- Genre coverage is uneven — Fantasy and Science Fiction returned empty on Assessment B's attempts while Fiction returned 14 rows.
- `LibrarySuggestions` returns `null` while loading; `GenreSuggestions` shows a spinner. Same file, opposite loading philosophies.
- The cover URL is present in the prefill and rendered as a raw text-input string; a cover image never appears anywhere in this flow.
- A genre pill cannot be deselected — no route back to the neutral "Pick a genre" state.
- The `added` checkmark is per-row component state and resets on any re-fetch or genre change.
- `key={r.isbn13 ?? \`${r.title}-${i}\`}` — the index fallback will reshuffle per-row `added`/`formOpen` state if results reorder.
- Card heights are ragged: `line-clamp-3` against mostly one-line descriptions produces an arrhythmic column.
- Only 2 `<img>` on the entire page, neither in the suggestions section, so lazy-loading is moot here.

## Questions to Consider

1. The title is already in `aria-label` on every add button. If the premise is "titles bias the reader," why does the code exempt screen-reader users from that bias — and what exactly is it protecting sighted users from?
2. Roughly half the live descriptions were publisher *marketing* copy ("phenomenal, best-selling", "sure to captivate readers"). Hiding the title to escape brand influence while showing the marketing department's own words may have *increased* it. What signal was the redesign actually trying to isolate?
3. The filter already drops description-less results, conceding the card is unrenderable without one. `Sams Local 11-7-2004 $35.00.` passed it. If the filter's real job is "does this card carry meaning," is non-emptiness anywhere near the right test?
4. PRODUCT.md forbids inventing data and requires an honest "—" instead. Is *withholding* real data the app already holds a different kind of dishonesty, or the same one facing the other way?
5. If the goal is a blind, synopsis-first judgment, why is it a *list*? One card at a time — one synopsis, "read more" / "not for me" — would actually deliver that. A scrolling column of 20 untitled paragraphs delivers neither blind focus nor efficient comparison.
