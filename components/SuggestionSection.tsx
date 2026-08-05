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
import { useCreateBook, useGenreSuggestions, useSuggestions } from "@/lib/queries";
import { SUGGESTION_GENRES } from "@/lib/constants";
import { cn } from "@/lib/utils";
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

function ReasonTag({ reason }: { reason?: string }) {
  if (!reason) return null;
  return (
    <span className="inline-flex shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
      {reason}
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
      className="block shrink-0 rounded-2xl border bg-card p-4 shadow-card transition-[box-shadow,transform] hover:shadow-card-hover active:scale-[0.99]"
    >
      <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
        {suggestion.description?.trim() || suggestion.title}
      </p>
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
  const { data, isLoading, isFetching } = useGenreSuggestions(genre);
  const results = data?.results ?? [];

  return (
    <div className="space-y-3">
      <FilterPills
        value={genre}
        onChange={setGenre}
        items={GENRE_ITEMS}
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
        <EmptyState
          icon={Sparkles}
          title="No results"
          description={`Nothing found for ${genre}. Try a different genre.`}
        />
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

  const createMutation = useCreateBook();

  async function handlePick() {
    setFormError(null);
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
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">
          {result.description?.trim() || result.title}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <ReasonTag reason={result.reasons[0]} />
          <button
            type="button"
            onClick={added ? undefined : handlePick}
            disabled={resolving || added}
            aria-label={added ? "Added to library" : `Add ${result.title}`}
            title={added ? "Added to library" : "Add to library"}
            className={cn(
              "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.95] disabled:active:scale-100",
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
        title="Add a book"
        description="Review the details, then save."
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
