"use client";

import * as React from "react";
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
import { LibraryToolbar, type LibraryFilters } from "@/components/LibraryToolbar";
import {
  ApiRequestError,
  createBook,
  deleteBook,
  enrichBooks,
  listBooks,
  updateBook,
} from "@/lib/api";
import type { LibraryBook, Paginated } from "@/lib/types";
import type { BookMetadata } from "@/lib/metadata";

const DEFAULT_FILTERS: LibraryFilters = {
  q: "",
  status: "",
  sort: "createdAt",
  order: "desc",
};

export function LibraryView() {
  const [filters, setFilters] = React.useState<LibraryFilters>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<Paginated<LibraryBook> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);

  // dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LibraryBook | null>(null);
  const [prefill, setPrefill] = React.useState<BookPrefill | undefined>(
    undefined,
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // barcode scanner state
  const [scannerOpen, setScannerOpen] = React.useState(false);

  // metadata enrichment state
  const [enriching, setEnriching] = React.useState(false);
  const [enrichMsg, setEnrichMsg] = React.useState<string | null>(null);

  // delete confirm state
  const [toDelete, setToDelete] = React.useState<LibraryBook | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Debounce the search box; reset to page 1 whenever filters change.
  const [debouncedQ, setDebouncedQ] = React.useState(filters.q);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQ, filters.status, filters.sort, filters.order]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const result = await listBooks({
        q: debouncedQ || undefined,
        status: filters.status || undefined,
        sort: filters.sort,
        order: filters.order,
        page,
      });
      setData(result);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Failed to load your library.",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters.status, filters.sort, filters.order, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setPrefill(undefined);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(book: LibraryBook) {
    setEditing(book);
    setPrefill(undefined);
    setFormError(null);
    setFormOpen(true);
  }

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
    setEnriching(true);
    setEnrichMsg(null);
    try {
      const result = await enrichBooks();
      await load();
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
      setEnriching(false);
      setTimeout(() => setEnrichMsg(null), 5000);
    }
  }

  async function handleSubmit(values: BookFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await updateBook(editing.id, values);
      } else {
        await createBook(values);
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteBook(toDelete.id);
      setToDelete(null);
      // If we just emptied the last page, step back one.
      if (data && data.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch {
      // keep dialog open on failure
    } finally {
      setDeleting(false);
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const isEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-5">
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

      <LibraryToolbar filters={filters} onChange={setFilters} />

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}{" "}
          <button onClick={load} className="font-medium underline">
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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={openEdit}
              onDelete={setToDelete}
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
        />
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onResolved={handleScanResolved}
        onAdded={load}
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
