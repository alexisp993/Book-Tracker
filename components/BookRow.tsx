"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/BookCover";
import { StarRating } from "@/components/StarRating";
import { STATUS_DOT, STATUS_LABELS } from "@/lib/constants";
import type { LibraryBook } from "@/lib/types";

// The default Library row — denser than the card grid but progress-forward.
// Tapping the row navigates to the book's detail page; "Start" is a separate
// tap target that doesn't also trigger navigation. Memoized (same reasoning
// as BookCard); effective only because LibraryView passes stable callbacks.
export const BookRow = React.memo(function BookRow({
  book,
  onEdit: _onEdit,
  onStartReading,
}: {
  book: LibraryBook;
  onEdit?: (book: LibraryBook) => void;
  onStartReading?: (book: LibraryBook) => void;
}) {
  const canStart = book.status === "WANT_TO_READ" || book.status === "ON_HOLD";
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
      <div className="pointer-events-none relative h-14 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
        <BookCover book={book} />
      </div>
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
          {book.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
        </p>
        {progress !== null ? (
          <div className="mt-1.5">
            <div className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
            </p>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={cn("h-2 w-2 rounded-full", STATUS_DOT[book.status])}
              />
              {STATUS_LABELS[book.status]}
            </span>
            {book.rating ? <StarRating value={book.rating} size={12} /> : null}
            {book.favorite ? (
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            ) : null}
          </div>
        )}
      </div>
      {canStart && onStartReading ? (
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 shrink-0 border-warm/30 bg-warm/10 text-warm hover:bg-warm/20"
          onClick={(e) => {
            e.preventDefault();
            onStartReading(book);
          }}
          aria-label={`Start reading ${book.title}`}
        >
          <BookOpen className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
});
