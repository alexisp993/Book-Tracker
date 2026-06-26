"use client";

import * as React from "react";
import { ChevronRight, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/BookCover";
import { StarRating } from "@/components/StarRating";
import { STATUS_DOT, STATUS_LABELS } from "@/lib/constants";
import type { LibraryBook } from "@/lib/types";

// Dense list row — fits many titles on screen. Tapping opens edit. Memoized
// (same reasoning as BookCard); effective only because LibraryView passes a
// stable `onEdit` (useCallback), not a fresh inline function.
export const BookRow = React.memo(function BookRow({
  book,
  onEdit,
}: {
  book: LibraryBook;
  onEdit: (book: LibraryBook) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(book)}
      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary"
    >
      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
        <BookCover book={book} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
          {book.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
        </p>
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
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
});
