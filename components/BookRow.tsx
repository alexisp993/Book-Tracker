"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookCover, CoverFrame } from "@/components/BookCover";
import { ProgressBar } from "@/components/ui/bar";
import { StarRating } from "@/components/StarRating";
import { BookActionsMenu } from "@/components/BookActionsMenu";
import { STATUS_LABELS, STATUS_TEXT } from "@/lib/constants";
import type { LibraryBook } from "@/lib/types";

// The default Library row — denser than the card grid but progress-forward.
// Tapping the row navigates to the book's detail page; the kebab menu is a
// separate tap target that doesn't also trigger navigation. Memoized (same
// reasoning as BookCard); effective only because LibraryView passes stable
// callbacks.
export const BookRow = React.memo(function BookRow({
  book,
  onEdit,
  onDelete,
  onStartReading,
  onMarkFinished,
  onToggleFavorite,
}: {
  book: LibraryBook;
  onEdit?: (book: LibraryBook) => void;
  onDelete?: (book: LibraryBook) => void;
  onStartReading?: (book: LibraryBook) => void;
  onMarkFinished?: (book: LibraryBook) => void;
  onToggleFavorite?: (book: LibraryBook) => void;
}) {
  const progress =
    book.status === "CURRENTLY_READING" && book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    <div className="relative flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary">
      <Link
        href={`/books/${book.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={`View ${book.title}`}
      />
      <CoverFrame size="sm" className="pointer-events-none relative">
        <BookCover book={book} />
      </CoverFrame>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="line-clamp-1 font-display text-title-sm font-semibold leading-tight">
          {book.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
        </p>
        {progress !== null ? (
          <div className="mt-1.5">
            {/* Was a hand-rolled track+fill pair — the third of three progress
                implementations in the app, and the only one that wouldn't pick
                up a change to the shared primitive. */}
            <ProgressBar value={progress} className="h-1.5 max-w-[180px]" />
            <p className="mt-1 text-caption-sm text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
            </p>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span className={cn("text-caption-sm font-medium", STATUS_TEXT[book.status])}>
              {STATUS_LABELS[book.status]}
            </span>
            {book.rating ? <StarRating value={book.rating} size={12} /> : null}
            {book.favorite ? (
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Kebab actions — a separate tap target (pointer-events restored) so it
          never triggers the row-level navigation Link above. */}
      <div className="pointer-events-auto relative">
        <BookActionsMenu
          book={book}
          onStartReading={onStartReading}
          onMarkFinished={onMarkFinished}
          onEdit={onEdit}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
});
