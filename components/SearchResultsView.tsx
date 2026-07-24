"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { BookForm, type BookFormValues, type BookPrefill } from "@/components/BookForm";
import { ApiRequestError, lookupIsbn } from "@/lib/api";
import { useBookSearch, useCreateBook } from "@/lib/queries";
import type { BookSearchResult } from "@/lib/metadata";

// Self-contained: owns its own create-book mutation and form dialog rather
// than threading a chosen result back into LibraryView across routes — the
// same reusable BookForm/Dialog/useCreateBook LibraryView itself uses.
export function SearchResultsView({ initialQ = "" }: { initialQ?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQ);
  const [debouncedQ, setDebouncedQ] = React.useState(initialQ);
  const [prefill, setPrefill] = React.useState<BookPrefill | undefined>(undefined);
  const [resolving, setResolving] = React.useState<string | null>(null); // isbn13 being resolved
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [justAdded, setJustAdded] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError } = useBookSearch(debouncedQ);
  const results = data?.results ?? [];

  const createMutation = useCreateBook();

  async function handlePick(result: BookSearchResult) {
    setJustAdded(false);
    setFormError(null);

    // A search hit is lightweight (no description/publisher/page count) —
    // if it has an ISBN, resolve the full merged record first, the same
    // pipeline the barcode scanner already uses, so the prefilled form is
    // as complete as a scan. Falls back to the lightweight fields on a miss.
    if (result.isbn13) {
      setResolving(result.isbn13);
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
        setResolving(null);
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
      setJustAdded(true);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.push("/library/add")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, author, or ISBN"
          className="pl-9"
          autoFocus
        />
      </div>

      {justAdded ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" /> Added to your library. Keep searching, or
          <button
            type="button"
            onClick={() => router.push("/library")}
            className="font-medium underline"
          >
            go to Library
          </button>
          .
        </div>
      ) : null}

      {debouncedQ.trim().length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Start typing a title, author, or ISBN to search.
        </p>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Searching…</p>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Couldn&rsquo;t search right now. Try again in a moment.
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={`Nothing found for "${debouncedQ}". Try a different title, author, or the ISBN.`}
        />
      ) : (
        <div className="space-y-2">
          {results.map((r, i) => (
            <ResultRow
              key={r.isbn13 ?? `${r.title}-${i}`}
              result={r}
              resolving={resolving === r.isbn13}
              onPick={() => handlePick(r)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a book"
        description="Review the details from your search, then save."
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
    </div>
  );
}

function ResultRow({
  result,
  resolving,
  onPick,
}: {
  result: BookSearchResult;
  resolving: boolean;
  onPick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-card">
      <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {result.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.coverUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
          {result.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {result.authors.length > 0 ? result.authors.join(", ") : "Unknown author"}
          {result.publishedDate ? ` · ${result.publishedDate}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onPick}
        disabled={resolving}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        aria-label={`Add ${result.title}`}
      >
        {resolving ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
