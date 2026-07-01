"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Pencil,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BookCover } from "@/components/BookCover";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { EmptyState } from "@/components/EmptyState";
import {
  BookForm,
  type BookFormValues,
} from "@/components/BookForm";
import { ApiRequestError } from "@/lib/api";
import {
  useBook,
  useUpdateBook,
  useSessions,
  useDeleteBook,
} from "@/lib/queries";
import { NotesView } from "@/components/NotesView";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";

type Tab = "info" | "sessions" | "notes";

export function BookDetailView({ id }: { id: string }) {
  const { data: book, isLoading } = useBook(id);
  const [tab, setTab] = React.useState<Tab>("info");
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();

  async function handleSubmit(values: BookFormValues) {
    if (!book) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: book.id, input: values });
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Book not found"
        description="This book isn't in your library."
        action={
          <Link
            href="/library"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Library
          </Link>
        }
      />
    );
  }

  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </Link>

      {/* Header card */}
      <div className="flex gap-4 rounded-2xl border bg-card p-4">
        <div className="h-32 w-22 sm:h-40 sm:w-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
          <BookCover book={book} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
                  {book.subtitle}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => { setFormError(null); setFormOpen(true); }}
              aria-label="Edit book"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={book.status} />
            {book.favorite ? (
              <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                <Heart className="h-3.5 w-3.5 fill-rose-500" /> Favorite
              </span>
            ) : null}
            {book.rating ? <StarRating value={book.rating} size={13} /> : null}
          </div>

          {progress !== null && book.status === "CURRENTLY_READING" ? (
            <div className="mt-3">
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {book.currentPage}/{book.pageCount} pages · {progress}%
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border bg-muted/50 p-1">
        {(["info", "sessions", "notes"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "info" && <InfoTab book={book} />}
      {tab === "sessions" && <SessionsTab userBookId={book.id} />}
      {tab === "notes" && <NotesTab userBookId={book.id} />}

      {/* Edit modal */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Edit book"
      >
        <BookForm
          key={book.id}
          initial={book}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          onDelete={() => {
            deleteMutation.mutate(book.id);
            setFormOpen(false);
          }}
        />
      </Dialog>
    </div>
  );
}

// --- Info tab ---

function InfoTab({ book }: { book: ReturnType<typeof useBook>["data"] & object }) {
  return (
    <div className="space-y-4">
      {book.description ? (
        <div>
          <h2 className="mb-1.5 text-sm font-semibold">About</h2>
          <p className="text-sm leading-relaxed text-muted-foreground line-clamp-6">
            {book.description}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {book.pageCount ? (
          <InfoCell label="Pages" value={book.pageCount.toLocaleString()} />
        ) : null}
        {book.publisher ? (
          <InfoCell label="Publisher" value={book.publisher} />
        ) : null}
        {book.publishedDate ? (
          <InfoCell label="Published" value={book.publishedDate} />
        ) : null}
        {book.language ? (
          <InfoCell label="Language" value={book.language.toUpperCase()} />
        ) : null}
        {book.isbn13 ? (
          <InfoCell label="ISBN-13" value={book.isbn13} />
        ) : null}
        {book.startDate ? (
          <InfoCell label="Started" value={formatDate(book.startDate)} />
        ) : null}
        {book.finishDate ? (
          <InfoCell label="Finished" value={formatDate(book.finishDate)} />
        ) : null}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

// --- Sessions tab ---

function SessionsTab({ userBookId }: { userBookId: string }) {
  const { data, isLoading } = useSessions({ userBookId, pageSize: 50 });
  const items = data?.items ?? [];

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Timer}
        title="No sessions yet"
        description="Log a reading session to start tracking your progress on this book."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {items.length} session{items.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{formatDate(s.date)}</p>
              <p className="text-xs text-muted-foreground">
                📖 {formatDuration(s.minutes)}
                {s.pagesRead ? ` · ${s.pagesRead} pages` : ""}
                {s.mood ? ` · ${MOOD_EMOJI[s.mood]} ${MOOD_LABELS[s.mood]}` : ""}
              </p>
              {s.note ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
                  {s.note}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Notes tab ---

function NotesTab({ userBookId }: { userBookId: string }) {
  return <NotesView userBookId={userBookId} />;
}
