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
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((s) => (
          <LibrarySuggestionCard key={s.id} suggestion={s} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Suggestions are from your Want to Read list, ranked by genre, author, and series match.
      </p>
    </div>
  );
}

function LibrarySuggestionCard({ suggestion }: { suggestion: SuggestionItem }) {
  return (
    <Link
      href={`/books/${suggestion.id}`}
      className="group flex w-[140px] shrink-0 flex-col gap-2 transition-transform active:scale-[0.98]"
    >
      <SuggestionCoverFrame
        coverUrl={suggestion.coverUrl}
        title={suggestion.title}
        caption={suggestion.reasons[0]}
      />
      <SuggestionCaption title={suggestion.title} author={suggestion.authors[0]} />
    </Link>
  );
}

// External discovery mode — search results aren't in the library yet, so
// each card opens the same resolve-then-prefill add flow as
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
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {results.map((r, i) => (
              <GenreSuggestionCard key={r.isbn13 ?? `${r.title}-${i}`} result={r} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Ranked by author matches and reader ratings — books you already have are left out.
          </p>
        </div>
      )}
    </div>
  );
}

function GenreSuggestionCard({ result }: { result: GenreSuggestionItem }) {
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
      <button
        type="button"
        onClick={added ? undefined : handlePick}
        disabled={resolving || added}
        className="group flex w-[140px] shrink-0 flex-col gap-2 text-left transition-transform active:scale-[0.98] disabled:cursor-default disabled:active:scale-100"
      >
        <div className="relative">
          <SuggestionCoverFrame
            coverUrl={result.coverUrl}
            title={result.title}
            caption={result.reasons[0]}
          />
          <span
            className={
              "absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-colors " +
              (added
                ? "bg-emerald-500 text-white"
                : "bg-background/90 text-foreground backdrop-blur-sm group-hover:bg-primary group-hover:text-primary-foreground")
            }
            aria-hidden
          >
            {resolving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </span>
        </div>
        <SuggestionCaption title={result.title} author={result.authors[0]} />
      </button>

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

function SuggestionCoverFrame({
  coverUrl,
  title,
  caption,
}: {
  coverUrl: string | null | undefined;
  title: string;
  caption?: string;
}) {
  return (
    <div className="relative h-[210px] w-[140px] overflow-hidden rounded-xl border bg-muted shadow-cover transition-[transform,box-shadow] group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-primary/10 p-3">
          <p className="text-center text-xs font-medium leading-snug text-primary/60">
            {title}
          </p>
        </div>
      )}
      {caption ? (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
          <p className="line-clamp-2 text-[10px] leading-tight text-white/90">{caption}</p>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionCaption({ title, author }: { title: string; author?: string }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 text-caption-sm font-medium leading-tight">{title}</p>
      {author ? (
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{author}</p>
      ) : null}
    </div>
  );
}
