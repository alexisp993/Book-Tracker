"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus, Sparkles } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Dialog } from "@/components/ui/dialog";
import { BookForm, type BookFormValues, type BookPrefill } from "@/components/BookForm";
import { FilterPills, SegmentedTabs, type TabItem } from "@/components/ui/tabs";
import { ApiRequestError, lookupIsbn } from "@/lib/api";
import { useCreateBook, useGenreSuggestions, useStats, useSuggestions } from "@/lib/queries";
import { SUGGESTION_GENRES } from "@/lib/constants";
import { cn, focusRing, hitArea } from "@/lib/utils";
import type { GenreSuggestionItem, SuggestionItem } from "@/lib/api";

type Mode = "library" | "genre";

// Kept short and evenly matched on purpose — SegmentedTabs splits width
// evenly between exactly two segments, so a much longer label on one side
// (the original "From My Library") wraps to two lines while the other
// stays on one, producing two visibly different pill heights.
const MODE_TABS: readonly TabItem<Mode>[] = [
  { value: "library", label: "My Library" },
  { value: "genre", label: "By Genre" },
];

const GENRE_ITEMS: readonly TabItem<string>[] = SUGGESTION_GENRES.map((g) => ({
  value: g,
  label: g,
}));

// The list shell for both modes.
//
// This used to be a 420px-tall inner scroll box with its own scrollbar and a
// bottom fade. On a page whose only job is this list, that meant the
// suggestions were squeezed into the top third of the viewport with several
// hundred pixels of empty paper beneath them, and a second scrollbar competing
// with the page's own. It also forced every card to the full width of the
// shell, so each synopsis ran ~180 characters a line — unreadable, and the
// whole point of these cards is that you read the blurb.
//
// Now: a responsive grid that uses the width, with the page itself doing the
// scrolling. Two columns from `md`, three from `xl` — each card lands near a
// 65–75 character measure, which is the readable range.
function SuggestionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
  );
}

// Why this book is being suggested — a label, not a control.
//
// This was a blue `bg-primary/10 text-primary` pill, which broke two rules
// at once. Measured, it fell to 4.46:1 in dark (below the 4.5 AA floor) and
// sat at exactly 4.50 in light, with no headroom in either — hue-on-hue at
// 11px has almost none to give. And design-system MASTER.md §7 reserves
// `primary` for interactive/progress, while §7.5 puts labels at
// `muted-foreground`; a non-interactive metadata tag rendered in the
// interactive blue was miscoding what the color means.
//
// Muted-foreground directly on the card measures 5.30 / 6.71 / 5.47 across
// light / dark / forest — passing with real margin in all three. The small
// leading icon keeps it distinct from the synopsis above it now that the
// pill is gone.
// The card's content, in the order a reader should meet it: the synopsis
// leads (that was the whole point of the redesign), with title and author
// underneath as a quiet attribution line.
//
// The line exists because synopsis-only cards were unrecoverable. The title
// was already in the DOM — it sat in the add button's aria-label — so a
// screen-reader user heard "Add The Dark Tower VII" while the sighted reader
// saw a price sticker. Showing it costs nothing and removes that asymmetry.
//
// With no usable synopsis, title becomes the lead instead of leaving a card
// that is entirely muted text, so a bare record still reads as a real card.
// The synopsis, and nothing else.
//
// A previous pass added a title · author line here to make cards
// "recoverable" — which quietly destroyed the point of the design. The
// reader is meant to judge the story blind and only learn what the book is
// once they've decided they're interested; putting the title on the card
// turns it straight back into a normal recommendation list where a familiar
// name or a known author does the deciding.
//
// Identity is revealed at the add step, where the form shows title, author,
// cover, publisher and the rest. Cards with no usable synopsis are filtered
// out server-side rather than falling back to a title, because a title-only
// card is precisely what this surface exists not to be.
function SuggestionBody({
  synopsis,
  expanded = false,
}: {
  synopsis: string;
  expanded?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "text-sm leading-relaxed text-foreground/90",
          // Capped by default so the list stays scannable; the full text is
          // one tap away rather than behind the add-book modal.
          !expanded && "line-clamp-3",
        )}
      >
        {synopsis}
      </p>
    </div>
  );
}

function ReasonTag({ reason }: { reason?: string }) {
  if (!reason) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-caption-sm text-muted-foreground">
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{reason}</span>
    </span>
  );
}

export function SuggestionSection() {
  const [mode, setMode] = React.useState<Mode>("library");

  return (
    // No local header. This used to be a section buried at the bottom of the
    // Collections page and needed to announce itself; it is its own route now,
    // and "Pick Your Next Read" directly under the page title "What to read
    // next" was the same sentence twice.
    <section className="space-y-4">
      <SegmentedTabs
        value={mode}
        onChange={setMode}
        items={MODE_TABS}
        className="w-auto"
      />
      {mode === "library" ? <LibrarySuggestions /> : <GenreSuggestions />}
    </section>
  );
}

function LibrarySuggestions() {
  const { data: suggestions = [], isLoading } = useSuggestions();

  // Was `return null` — the section collapsed to a bare header and then
  // popped in, while genre mode showed a spinner for the same wait. Same
  // component, same kind of fetch; they should resolve the same way.
  if (isLoading) return <Loading label="Finding suggestions…" />;
  if (suggestions.length === 0) {
    return (
      // Authored and left-aligned, like the rest of the app's empty states.
      <div className="max-w-md py-4">
        <p className="font-display text-2xl leading-snug">
          Not enough to go on yet.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          These are scored against the authors and genres you&rsquo;ve already
          read and rated. Finish or rate a couple of books and your want-to-read
          pile will start sorting itself.
        </p>
        <Link
          href="/library?status=WANT_TO_READ"
          className="mt-4 inline-flex items-center gap-1.5 border-b border-primary/40 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary"
        >
          See your want-to-read pile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SuggestionList>
        {suggestions.map((s) => (
          <LibrarySuggestionRow key={s.id} suggestion={s} />
        ))}
      </SuggestionList>
      <p className="text-xs text-muted-foreground">
        Suggestions are from your Want to Read list, ranked by genre, author, and series match.
      </p>
    </div>
  );
}

// Already in the library — the row opens the book, it doesn't add anything.
function LibrarySuggestionRow({ suggestion }: { suggestion: SuggestionItem }) {
  return (
    <Link
      href={`/books/${suggestion.id}`}
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-4 shadow-card transition-[box-shadow,transform] hover:shadow-card-hover active:scale-[0.99]",
        focusRing,
      )}
    >
      <SuggestionBody synopsis={suggestion.description ?? ""} />
      {suggestion.reasons[0] ? (
        <div className="mt-auto pt-3">
          <ReasonTag reason={suggestion.reasons[0]} />
        </div>
      ) : null}
    </Link>
  );
}

// External discovery mode — search results aren't in the library yet, so
// each row opens the same resolve-then-prefill add flow as
// SearchResultsView instead of linking to a local /books/[id].
function GenreSuggestions() {
  const [genre, setGenre] = React.useState("");
  const { data: stats } = useStats();

  // Lead with the genres this reader actually reads. The app already knows
  // them — `genreBreakdown` is computed for Statistics — but the pill row was
  // a static alphabet, so the one personalised thing this surface could do
  // was being thrown away. Genres the reader has no books in keep their
  // original order behind the matches.
  const genreItems = React.useMemo(() => {
    const rank = new Map(
      (stats?.genreBreakdown ?? []).map((g, i) => [g.name.toLowerCase(), i]),
    );
    return [...GENRE_ITEMS].sort((a, b) => {
      const ra = rank.get(a.value.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.value.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }, [stats?.genreBreakdown]);

  const { data, isLoading, isFetching } = useGenreSuggestions(genre);
  const results = data?.results ?? [];
  const providerCount = data?.providerCount ?? 0;

  return (
    <div className="space-y-3">
      <FilterPills
        value={genre}
        // Re-picking the selected genre clears it. Without this there was no
        // route back to the neutral "pick a genre" state once you'd chosen —
        // a one-way door on a browsing control.
        onChange={(g) => setGenre((current) => (current === g ? "" : g))}
        items={genreItems}
        size="sm"
        scrollable
      />

      {!genre ? (
        <Aside
          title="Pick a genre."
          body="Anything above. These come from outside your library, so it's a way to find something you'd never have gone looking for."
        />
      ) : isLoading || isFetching ? (
        <Loading label="Finding books…" />
      ) : results.length === 0 ? (
        // Two very different situations produce an empty list, and telling
        // the reader "nothing found" for both is misleading: one is us
        // failing, the other is them already being well-read in this genre.
        providerCount > 0 ? (
          <Aside
            title={`Nothing for ${genre} right now.`}
            body="We only suggest books we can show a summary for, and none came back this time. Try another genre."
          />
        ) : (
          <Aside
            title="Couldn't reach the book service."
            body="No results came back just now. Try again in a moment, or pick a different genre."
          />
        )
      ) : (
        <div className="space-y-2">
          <SuggestionList>
            {results.map((r) => (
              // Keyed on identity, not position. The old `${title}-${index}`
              // fallback meant a reorder handed one book's row state — its
              // expanded panel, its green "added" tick — to whichever book
              // landed at that index.
              <GenreSuggestionRow
                key={r.isbn13 ?? `${r.title}|${r.authors[0] ?? ""}`}
                result={r}
              />
            ))}
          </SuggestionList>
          <p className="text-xs text-muted-foreground">
            Ranked by author matches and reader ratings — books you already have are left out.
          </p>
        </div>
      )}
    </div>
  );
}

function GenreSuggestionRow({ result }: { result: GenreSuggestionItem }) {
  const [prefill, setPrefill] = React.useState<BookPrefill | undefined>(undefined);
  const [resolving, setResolving] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [added, setAdded] = React.useState(false);
  // The full-record lookup can miss, and the fallback quietly fills the form
  // with only the thin search fields. Saying so beats letting someone save a
  // half-empty record believing it was fetched.
  const [partialDetails, setPartialDetails] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const createMutation = useCreateBook();

  async function handlePick() {
    setFormError(null);
    setPartialDetails(false);
    if (result.isbn13) {
      setResolving(true);
      try {
        const full = await lookupIsbn(result.isbn13);
        setPrefill({
          title: full.title,
          subtitle: full.subtitle,
          authors: full.authors.join(", "),
          description: full.description,
          publisher: full.publisher,
          publishedDate: full.publishedDate,
          isbn13: full.isbn13,
          pageCount: full.pageCount,
          coverUrl: full.coverUrl,
        });
      } catch {
        setPartialDetails(true);
        setPrefill({
          title: result.title,
          subtitle: result.subtitle,
          authors: result.authors.join(", "),
          description: result.description,
          publishedDate: result.publishedDate,
          isbn13: result.isbn13,
          coverUrl: result.coverUrl,
        });
      } finally {
        setResolving(false);
      }
    } else {
      setPrefill({
        title: result.title,
        subtitle: result.subtitle,
        authors: result.authors.join(", "),
        description: result.description,
        publishedDate: result.publishedDate,
        coverUrl: result.coverUrl,
      });
    }
    setFormOpen(true);
  }

  async function handleSubmit(values: BookFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      setFormOpen(false);
      setAdded(true);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  return (
    <>
      {/* h-full + flex column so every card in a grid row is the same height
          and the action row sits on a common baseline, however long the
          synopsis is. Ragged button positions were the giveaway that this had
          been a single-column list. */}
      <div className="flex h-full flex-col rounded-2xl border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover">
        {/* The read-only rung between "no identity" and "a 10-field editable
            record". Browsing used to mean opening and dismissing a modal per
            card just to find out what a book was; now the body itself opens
            to the cover and the untruncated synopsis, and "+" stays a pure
            commit action. */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className={cn(
            "block w-full rounded-lg text-left transition-opacity hover:opacity-90",
            focusRing,
          )}
        >
          {/* No cover here either — expanding reveals the *rest of the
              story*, not the book's identity. The cover would give the game
              away as surely as the title does. */}
          <SuggestionBody synopsis={result.description ?? ""} expanded={expanded} />
        </button>
        <div className="mt-auto flex items-center gap-2 pt-3">
          <ReasonTag reason={result.reasons[0]} />
          <button
            type="button"
            onClick={added ? undefined : handlePick}
            disabled={resolving || added}
            // The one place the title is still exposed, and deliberately so:
            // twenty identical icon-only buttons need distinguishable
            // accessible names or the list is unusable with a screen reader.
            // "Add this book" twenty times over is not a usable alternative.
            // The blind-judgment premise yields to that.
            aria-label={
              added ? `${result.title} added to your library` : `Add ${result.title} to your library`
            }
            title={added ? "Added to your library" : "Add to your library"}
            className={cn(
              "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.95] disabled:active:scale-100",
              focusRing,
              // Safe here: the button sits alone at the row's trailing edge
              // inside p-4, so the 44px region stays within the card and
              // can't reach the next row's button.
              hitArea,
              added
                ? "bg-emerald-500 text-white"
                : // `bg-muted` on `bg-card` nearly disappears in dark, which
                  // left the card's only action as its weakest element in the
                  // theme the product calls "midnight ink". A border gives it
                  // an edge in every theme without shouting.
                  "border bg-muted text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground",
            )}
          >
            {resolving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        // Name the book. This dialog is the moment identity finally resolves,
        // and titling it "Add a book" buried the answer inside a form field.
        title={`Add ${result.title}`}
        description={
          partialDetails
            ? "We couldn't load the full record for this one — check the details before saving."
            : "Review the details, then save."
        }
      >
        <BookForm
          key={prefill?.isbn13 ?? prefill?.title ?? "new"}
          prefill={prefill}
          submitting={createMutation.isPending}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>
    </>
  );
}

// The page's shared empty/interstitial voice: a sentence at reading size and
// one line of explanation, left-aligned. Replaces four dashed EmptyState boxes
// that each centred a "no results" message in a full-width panel.
function Aside({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md py-4">
      <p className="font-display text-2xl leading-snug">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
