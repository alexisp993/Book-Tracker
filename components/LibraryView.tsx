"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookPlus,
  ChevronLeft,
  ChevronRight,
  Library,
  RefreshCw,
  ScanBarcode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ViewToggle, type LibraryViewMode } from "@/components/ViewToggle";
import { ApiRequestError } from "@/lib/api";
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

export function LibraryView() {
  const [filters, setFilters] = React.useState<LibraryFilters>(DEFAULT_FILTERS);
  const [view, setView] = React.useState<LibraryViewMode>("comfortable");
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <p className="text-sm text-muted-foreground">
            {loading && !data
              ? "Loading…"
              : `${total} book${total === 1 ? "" : "s"} in your library`}
          </p>
          {total > 0 ? (
            <button
              onClick={handleEnrich}
              disabled={enriching}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Fetch missing covers and details from Open Library / Google Books"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${enriching ? "animate-spin" : ""}`}
              />
              {enriching ? "Refreshing…" : enrichMsg ?? "Refresh details"}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            onClick={() => setScannerOpen(true)}
            className="w-full sm:w-auto"
          >
            <ScanBarcode className="h-4 w-4" /> Scan
          </Button>
          <Button onClick={openAdd} className="w-full sm:w-auto">
            <BookPlus className="h-4 w-4" /> Add book
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <LibraryToolbar filters={filters} onChange={setFilters} />
        </div>
        <ViewToggle value={view} onChange={changeView} />
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Library className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">
              {filters.q || filters.status
                ? "No books match your filters"
                : "Your library is empty"}
            </p>
            <p className="text-sm text-muted-foreground">
              {filters.q || filters.status
                ? "Try clearing the search or status filter."
                : "Add your first book to get started."}
            </p>
          </div>
          {!filters.q && !filters.status ? (
            <Button onClick={openAdd}>
              <BookPlus className="h-4 w-4" /> Add book
            </Button>
          ) : null}
        </div>
      ) : view === "list" ? (
        <div className="divide-y divide-border/60 rounded-2xl border bg-card p-1">
          {items.map((book) => (
            <BookRow key={book.id} book={book} onEdit={openEdit} />
          ))}
        </div>
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

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
