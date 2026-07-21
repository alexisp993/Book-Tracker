"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookPlus,
  Library,
  RefreshCw,
  ScanBarcode,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { LibraryToolbar, type LibraryFilters } from "@/components/LibraryToolbar";
import { EmptyState } from "@/components/EmptyState";
import { ListContainer } from "@/components/ui/list";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { StreakBanner } from "@/components/StreakBanner";
import { ViewToggle, type LibraryViewMode } from "@/components/ViewToggle";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  queryKeys,
  useBooks,
  useCreateBook,
  useDeleteBook,
  useEnrichBooks,
  useUpdateBook,
} from "@/lib/queries";
import type { LibraryBook } from "@/lib/types";
import type { BookMetadata } from "@/lib/metadata";

const DEFAULT_FILTERS: LibraryFilters = {
  q: "",
  status: "",
  sort: "createdAt",
  order: "desc",
};

// The primary status filter, surfaced as tabs. On Hold / Did Not Finish stay
// reachable via the search/filter sheet's existing status select.
const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "CURRENTLY_READING", label: "Currently Reading" },
  { value: "WANT_TO_READ", label: "Want to Read" },
  { value: "READ", label: "Read" },
];

export function LibraryView() {
  const [filters, setFilters] = React.useState<LibraryFilters>(DEFAULT_FILTERS);
  const [view, setView] = React.useState<LibraryViewMode>("list");
  const [page, setPage] = React.useState(1);

  // Persist the chosen view density across sessions.
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

  // dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LibraryBook | null>(null);
  const [prefill, setPrefill] = React.useState<BookPrefill | undefined>(
    undefined,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  // barcode scanner state
  const [scannerOpen, setScannerOpen] = React.useState(false);

  // metadata enrichment state
  const [enrichMsg, setEnrichMsg] = React.useState<string | null>(null);

  // delete confirm state
  const [toDelete, setToDelete] = React.useState<LibraryBook | null>(null);

  // mobile-only filter sheet (search/status/sort collapse into this on small screens)
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const filtersActive = filters.q !== "" || filters.status !== "";

  // Debounce the search box; reset to page 1 whenever filters change.
  const [debouncedQ, setDebouncedQ] = React.useState(filters.q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, filters.status, filters.sort, filters.order]);

  const queryParams = {
    q: debouncedQ || undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    order: filters.order,
    page,
  };
  const { data, isLoading: loading, isError, error, refetch } =
    useBooks(queryParams);
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

  // Deep-link entry points from the Add a Book launcher (and Home's existing
  // "Scan Book" quick action, which already linked to ?scan=1 but had no
  // handler here until now) — auto-open the matching dialog on arrival.
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

  // A barcode scan resolved metadata → open the add form prefilled with it.
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

  // Depend on `.mutate` itself (stable across renders) rather than the whole
  // mutation result object (whose identity TanStack Query may recreate every
  // render), so this callback's identity stays stable for React.memo below.
  const updateBookMutate = updateMutation.mutate;
  const handleStartReading = React.useCallback(
    (book: LibraryBook) => {
      updateBookMutate({
        id: book.id,
        input: { status: "CURRENTLY_READING" },
      });
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
  const isEmpty = !loading && items.length === 0;
  const submitting = createMutation.isPending || updateMutation.isPending;
  const deleting = deleteMutation.isPending;
  const enriching = enrichMutation.isPending;

  return (
    <div className="space-y-3 sm:space-y-6">
      <StreakBanner />
      <ContinueReadingCard onContinue={openEdit} />

      {/* Page title + search/filter icon actions */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">Library</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Search library"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Filter and sort"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {filtersActive ? (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            ) : null}
          </button>
        </div>
      </div>

      {/* Status tabs — the primary filter; On Hold / Did Not Finish remain
          reachable via the search/filter sheet's status select. */}
      <div className="flex items-center gap-2">
        <FilterPills
          className="flex-1"
          scrollable
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          items={STATUS_TABS}
        />
        <ViewToggle value={view} onChange={changeView} />
      </div>

      {/* Prominent Add Book CTA — opens the Scan/Search/Manual launcher */}
      <div className="flex items-center gap-2">
        <Button
          onClick={() => router.push("/library/add")}
          className="h-11 flex-1 rounded-full text-[15px]"
        >
          <BookPlus className="h-4 w-4" /> Add book
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setScannerOpen(true)}
          className="h-11 w-11 shrink-0 rounded-full"
          aria-label="Scan barcode"
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      {/* Count + unobtrusive refresh-details link */}
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {loading && !data ? "Loading…" : `${total} book${total === 1 ? "" : "s"}`}
        </p>
        {total > 0 ? (
          <button
            onClick={handleEnrich}
            disabled={enriching}
            className="inline-flex items-center gap-1 truncate text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Fetch missing covers and details from Open Library / Google Books"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 shrink-0 ${enriching ? "animate-spin" : ""}`}
            />
            {enriching ? "Refreshing…" : enrichMsg ?? "Refresh details"}
          </button>
        ) : null}
      </div>

      <Dialog
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Search & filter"
      >
        <LibraryToolbar filters={filters} onChange={setFilters} />
      </Dialog>

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={Library}
          title={
            filters.q || filters.status
              ? "No books match your filters"
              : "Your library is waiting"
          }
          description={
            filters.q || filters.status
              ? "Try clearing the search or status filter."
              : "Start building your personal reading collection."
          }
          action={
            !filters.q && !filters.status ? (
              <Button onClick={openAdd}>
                <BookPlus className="h-4 w-4" /> Add book
              </Button>
            ) : undefined
          }
        />
      ) : view === "list" ? (
        <ListContainer inset>
          {items.map((book) => (
            <BookRow
              key={book.id}
              book={book}
              onEdit={openEdit}
              onDelete={setToDelete}
              onStartReading={handleStartReading}
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
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        disabled={loading}
      />

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
          <span className="font-medium text-foreground">
            {toDelete?.title}
          </span>{" "}
          from your library? This deletes your reading entry for it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
