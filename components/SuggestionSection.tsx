"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
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

// Scrollable list shell shared by both modes: a capped-height column with a
// visible (not auto-hidden) scrollbar — this section can hold more entries
// than comfortably fit, so the scrollbar itself needs to read as "more
// below," not disappear like the app's other horizontal-scroll rows do —
// plus a bottom fade as a second, harder-to-miss hint.
function SuggestionList({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "flex max-h-[420px] flex-col gap-2.5 overflow-y-auto pb-1 pr-2",
          "[scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]",
          "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35",
        )}
      >
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
      />
    </div>
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
function SuggestionBody({
  synopsis,
  title,
  author,
  expanded = false,
}: {
  synopsis?: string | null;
  title: string;
  author?: string;
  expanded?: boolean;
}) {
  if (!synopsis) {
    return (
      <div className="min-w-0">
        <p className={cn("text-sm font-medium leading-relaxed", !expanded && "line-clamp-2")}>
          {title}
        </p>
        {author ? (
          <p className="mt-1 line-clamp-1 text-caption-sm text-muted-foreground">{author}</p>
        ) : null}
      </div>
    );
  }
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
      <p className="mt-1.5 line-clamp-1 text-caption-sm text-muted-foreground">
        {title}
        {author ? ` · ${author}` : ""}
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SuggestionHeader />
        <SegmentedTabs value={mode} onChange={setMode} items={MODE_TABS} className="w-auto" />
      </div>
      {mode === "library" ? <LibrarySuggestions /> : <GenreSuggestions />}
    </section>
  );
}

function SuggestionHeader() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold">Pick Your Next Read</h2>
    </div>
  );
}

function LibrarySuggestions() {
  const { data: suggestions = [], isLoading } = useSuggestions();

  if (isLoading) return null;
  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No suggestions yet"
        description="Rate or finish some books to get personalised recommendations from your TBR pile."
      />
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
        "block shrink-0 rounded-2xl border bg-card p-4 shadow-card transition-[box-shadow,transform] hover:shadow-card-hover active:scale-[0.99]",
        focusRing,
      )}
    >
      <SuggestionBody
        synopsis={suggestion.description}
        title={suggestion.title}
        author={suggestion.authors[0]}
      />
      {suggestion.reasons[0] ? (
        <div className="mt-2.5">
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
        onChange={setGenre}
        items={genreItems}
        size="sm"
        scrollable
      />

      {!genre ? (
        <EmptyState
          icon={Sparkles}
          title="Pick a genre"
          description="Choose a genre above to discover books outside your library."
        />
      ) : isLoading || isFetching ? (
        <Loading label="Finding books…" />
      ) : results.length === 0 ? (
        // Two very different situations produce an empty list, and telling
        // the reader "nothing found" for both is misleading: one is us
        // failing, the other is them already being well-read in this genre.
        providerCount > 0 ? (
          <EmptyState
            icon={Sparkles}
            title={`You already have every ${genre} book we found`}
            description="Try another genre — anything already in your library is left out of these suggestions."
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Couldn't reach the book service"
            description="No results came back for this genre just now. Try again in a moment, or pick a different genre."
          />
        )
      ) : (
        <div className="space-y-2">
          <SuggestionList>
            {results.map((r, i) => (
              <GenreSuggestionRow key={r.isbn13 ?? `${r.title}-${i}`} result={r} />
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
      <div className="shrink-0 rounded-2xl border bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover">
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
          <div className="flex gap-3">
            {expanded && result.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.coverUrl}
                alt=""
                className="h-[84px] w-14 shrink-0 rounded-md border bg-muted object-cover shadow-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : null}
            <SuggestionBody
              synopsis={result.description}
              title={result.title}
              author={result.authors[0]}
              expanded={expanded}
            />
          </div>
        </button>
        <div className="mt-2.5 flex items-center gap-2">
          <ReasonTag reason={result.reasons[0]} />
          <button
            type="button"
            onClick={added ? undefined : handlePick}
            disabled={resolving || added}
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
                : "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground",
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
