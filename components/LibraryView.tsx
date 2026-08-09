"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookPlus,
  Library,
  RefreshCw,
  ScanBarcode,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { FilterPills } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { BookCard } from "@/components/BookCard";
import {
  BookForm,
  type BookFormValues,
  type BookPrefill,
} from "@/components/BookForm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BookRow } from "@/components/BookRow";
import { BookScrollRow } from "@/components/BookScrollRow";
import { EmptyState } from "@/components/EmptyState";
import { ListContainer } from "@/components/ui/list";
import { Band } from "@/components/ui/section";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle, type LibraryViewMode } from "@/components/ViewToggle";
import { ApiRequestError } from "@/lib/api";
import { BOOK_SORTS, SORT_LABELS } from "@/lib/constants";
import {
  queryKeys,
  useBooks,
  useCreateBook,
  useDeleteBook,
  useEnrichBooks,
  useStats,
  useUpdateBook,
} from "@/lib/queries";
import type { LibraryBook } from "@/lib/types";
import type { BookMetadata } from "@/lib/metadata";

interface LibraryFilters {
  q: string;
  status: string; // "" = all
  sort: string;
  order: "asc" | "desc";
}

const DEFAULT_FILTERS: LibraryFilters = {
  q: "",
  status: "",
  sort: "createdAt",
  order: "desc",
};

export function LibraryView() {
  const [filters, setFilters] = React.useState<LibraryFilters>(DEFAULT_FILTERS);
  const [view, setView] = React.useState<LibraryViewMode>("list");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const saved = localStorage.getItem("bt_view");
    if (saved === "comfortable" || saved === "compact" || saved === "list") {
      setView(saved);
    }
  }, []);
  function changeView(mode: LibraryViewMode) {
    setView(mode);
    localStorage.setItem("bt_view", mode);
  }

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LibraryBook | null>(null);
  const [prefill, setPrefill] = React.useState<BookPrefill | undefined>(undefined);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);
  const [enrichMsg, setEnrichMsg] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<LibraryBook | null>(null);

  const [debouncedQ, setDebouncedQ] = React.useState(filters.q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, filters.status, filters.sort, filters.order]);

  // The "All" tab (no search) shows browsable shelf sections; any specific
  // status or a search shows the full paginated grid/list instead.
  const showShelves = filters.status === "" && !debouncedQ.trim();

  const { data: stats } = useStats();

  const queryParams = {
    q: debouncedQ || undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    order: filters.order,
    page,
  };
  const { data, isLoading: loading, isError, error, refetch } = useBooks(
    queryParams,
    { enabled: !showShelves },
  );

  // Shelf previews (only fetched on the All view).
  const reading = useBooks(
    { status: "CURRENTLY_READING", pageSize: 12 },
    { enabled: showShelves },
  );
  const wantToRead = useBooks(
    { status: "WANT_TO_READ", pageSize: 12 },
    { enabled: showShelves },
  );
  const read = useBooks({ status: "READ", pageSize: 12 }, { enabled: showShelves });
  const recentlyAdded = useBooks(
    { sort: "createdAt", order: "desc", pageSize: 12 },
    { enabled: showShelves },
  );

  const listError = isError
    ? error instanceof Error
      ? error.message
      : "Failed to load your library."
    : null;

  const qc = useQueryClient();
  const createMutation = useCreateBook();
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();
  const enrichMutation = useEnrichBooks();

  const openAdd = React.useCallback(() => {
    setEditing(null);
    setPrefill(undefined);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const router = useRouter();
  const searchParams = useSearchParams();
  React.useEffect(() => {
    if (searchParams.get("scan") === "1") {
      setScannerOpen(true);
      router.replace("/library");
    } else if (searchParams.get("add") === "1") {
      openAdd();
      router.replace("/library");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openEdit = React.useCallback((book: LibraryBook) => {
    setEditing(book);
    setPrefill(undefined);
    setFormError(null);
    setFormOpen(true);
  }, []);

  function handleScanResolved(metadata: BookMetadata) {
    setScannerOpen(false);
    setEditing(null);
    setPrefill({
      title: metadata.title,
      subtitle: metadata.subtitle,
      authors: metadata.authors.join(", "),
      description: metadata.description,
      publisher: metadata.publisher,
      publishedDate: metadata.publishedDate,
      isbn13: metadata.isbn13,
      pageCount: metadata.pageCount,
      coverUrl: metadata.coverUrl,
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleEnrich() {
    setEnrichMsg(null);
    try {
      const result = await enrichMutation.mutateAsync();
      setEnrichMsg(
        result.updated > 0
          ? `Updated ${result.updated} book${result.updated === 1 ? "" : "s"}${
              result.remaining > 0 ? ` · ${result.remaining} more to go` : ""
            }`
          : "Everything's already up to date.",
      );
    } catch {
      setEnrichMsg("Couldn't refresh details. Try again.");
    } finally {
      setTimeout(() => setEnrichMsg(null), 5000);
    }
  }

  const updateBookMutate = updateMutation.mutate;
  const handleStartReading = React.useCallback(
    (book: LibraryBook) => {
      updateBookMutate({ id: book.id, input: { status: "CURRENTLY_READING" } });
    },
    [updateBookMutate],
  );
  const handleToggleFavorite = React.useCallback(
    (book: LibraryBook) => {
      updateBookMutate({ id: book.id, input: { favorite: !book.favorite } });
    },
    [updateBookMutate],
  );

  async function handleSubmit(values: BookFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      setToDelete(null);
    } catch {
      // keep dialog open on failure
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isEmpty = !showShelves && !loading && items.length === 0;
  const submitting = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;
  const enriching = enrichMutation.isPending;

  const count = (n: number | undefined) => (n != null ? ` (${n})` : "");
  const statusTabs = [
    { value: "", label: `All${count(stats?.total)}` },
    { value: "CURRENTLY_READING", label: `Currently Reading${count(stats?.reading)}` },
    { value: "WANT_TO_READ", label: `Want to Read${count(stats?.wantToRead)}` },
    { value: "READ", label: `Read${count(stats?.read)}` },
  ];

  const readingBooks = reading.data?.items ?? [];
  const wantToReadBooks = wantToRead.data?.items ?? [];
  const readBooks = read.data?.items ?? [];
  const recentlyAddedBooks = recentlyAdded.data?.items ?? [];
  // The shelf queries can take several seconds on a cold serverless start.
  // Without an explicit loading branch every Shelf renders null and the page
  // sits completely blank — visually identical to an empty library.
  const shelvesLoading =
    showShelves &&
    (recentlyAdded.isLoading ||
      reading.isLoading ||
      wantToRead.isLoading ||
      read.isLoading);
  const shelvesEmpty =
    showShelves && !shelvesLoading && recentlyAddedBooks.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* The shared header, not a local copy of it — the subtitle says how
          much is here so the count doesn't need a badge. */}
      <PageHeader
        title="Library"
        subtitle={
          stats
            ? `${stats.total} book${stats.total === 1 ? "" : "s"} on your shelves`
            : "Everything you've collected"
        }
      />

      {/* Controls sit below the masthead rather than crowding its baseline. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative order-last w-full sm:order-none sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Search title, author, ISBN…"
            className="h-9 pl-9"
            aria-label="Search library"
          />
        </div>
        <Select
          value={`${filters.sort}:${filters.order}`}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(":");
            setFilters({ ...filters, sort, order: order as "asc" | "desc" });
          }}
          className="h-9 w-auto text-sm"
          aria-label="Sort books"
        >
          {BOOK_SORTS.flatMap((s) => {
            const orders: ("asc" | "desc")[] =
              s === "title" ? ["asc", "desc"] : ["desc", "asc"];
            return orders.map((o) => (
              <option key={`${s}:${o}`} value={`${s}:${o}`}>
                {SORT_LABELS[s]} ({o === "asc" ? "↑" : "↓"})
              </option>
            ));
          })}
        </Select>
        <ViewToggle value={view} onChange={changeView} />
        {/* Outline, not filled. Home spends its one filled affordance on
            "Continue reading"; a solid button here would out-shout the covers
            that are supposed to be the page. */}
        <Button variant="outline" size="sm" onClick={() => router.push("/library/add")}>
          <BookPlus className="h-4 w-4" /> Add Book
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setScannerOpen(true)}
          aria-label="Scan barcode"
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      {/* Status pills with live counts */}
      <div className="flex items-center gap-2">
        <FilterPills
          className="flex-1"
          scrollable
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          items={statusTabs}
        />
        {total > 0 && !showShelves ? (
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="hidden shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 sm:inline-flex"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${enriching ? "animate-spin" : ""}`} />
            {enriching ? "Refreshing…" : enrichMsg ?? "Refresh details"}
          </button>
        ) : null}
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {/* All view → shelf sections; a status/search → the full grid/list. */}
      {showShelves ? (
        shelvesLoading ? (
          <ShelfSkeleton />
        ) : shelvesEmpty ? (
          <EmptyState
            icon={Library}
            title="Your library is waiting"
            description="Start building your personal reading collection."
            action={
              <Button onClick={openAdd}>
                <BookPlus className="h-4 w-4" /> Add book
              </Button>
            }
          />
        ) : (
          // No space-y here: Band carries its own top rule and padding, so an
          // extra gap would double the separation between shelves.
          <div>
            <Shelf title="Recently Added" books={recentlyAddedBooks} />
            <Shelf
              title="Continue Reading"
              books={readingBooks}
              showProgress
              onSeeAll={() => setFilters({ ...filters, status: "CURRENTLY_READING" })}
            />
            <Shelf
              title="Want to Read"
              books={wantToReadBooks}
              onSeeAll={() => setFilters({ ...filters, status: "WANT_TO_READ" })}
            />
            <Shelf
              title="Read"
              books={readBooks}
              onSeeAll={() => setFilters({ ...filters, status: "READ" })}
            />
          </div>
        )
      ) : isEmpty ? (
        <EmptyState
          icon={Library}
          title="No books match your filters"
          description="Try clearing the search or picking a different status."
        />
      ) : (
        <>
          {view === "list" ? (
            <ListContainer inset>
              {items.map((book) => (
                <BookRow
                  key={book.id}
                  book={book}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onStartReading={handleStartReading}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </ListContainer>
          ) : view === "compact" ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {items.map((book) => (
                <BookCard key={book.id} book={book} compact onEdit={openEdit} onDelete={setToDelete} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onEdit={openEdit}
                  onDelete={setToDelete}
                  onStartReading={handleStartReading}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
        </>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit book" : "Add a book"}
        description={
          editing
            ? undefined
            : prefill
              ? "Review the auto-filled details from the scan, then save."
              : "Enter details manually, or close and use Scan to auto-fill from a barcode."
        }
      >
        <BookForm
          key={editing?.id ?? prefill?.isbn13 ?? "new"}
          initial={editing ?? undefined}
          prefill={prefill}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          onDelete={
            editing
              ? () => {
                  const target = editing;
                  setFormOpen(false);
                  setToDelete(target);
                }
              : undefined
          }
        />
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResolved={handleScanResolved}
        onAdded={() => {
          qc.invalidateQueries({ queryKey: queryKeys.booksAll });
          qc.invalidateQueries({ queryKey: queryKeys.stats });
        }}
      />

      <Dialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Remove book?"
      >
        <p className="text-sm text-muted-foreground">
          Remove{" "}
          <span className="font-medium text-foreground">{toDelete?.title}</span>{" "}
          from your library? This deletes your reading entry for it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

// A titled horizontal shelf of book covers; hides itself when empty.
// Mirrors the real shelf layout (heading + a row of portrait tiles) so the
// page doesn't reflow when the books arrive.
function ShelfSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your library">
      {[0, 1, 2].map((s) => (
        <section key={s} className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-[124px] shrink-0 space-y-1.5">
                <div className="h-[186px] w-[124px] animate-pulse rounded-xl bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Shelf({
  title,
  books,
  showProgress = false,
  onSeeAll,
}: {
  title: string;
  books: LibraryBook[];
  showProgress?: boolean;
  onSeeAll?: () => void;
}) {
  if (books.length === 0) return null;
  return (
    // Band, matching Home: hairline rule + quiet tracked label, no box. The
    // shelves on both screens are the same idea and now read as the same
    // system rather than two different heading treatments.
    <Band
      label={title}
      actions={
        onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            See all <ArrowRight className="h-3 w-3" />
          </button>
        ) : null
      }
    >
      {/* Browsing size. Library is where you come to look at your books, and
          88px thumbnails left most of a 1600px shell empty. */}
      <BookScrollRow books={books} showProgress={showProgress} size="xl" />
    </Band>
  );
}
