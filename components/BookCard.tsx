"use client";

import * as React from "react";
import { BookOpen, Heart, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { BookCover } from "@/components/BookCover";
import { STATUS_DOT } from "@/lib/constants";
import type { LibraryBook } from "@/lib/types";

// Rendered once per book in grid views (up to ~100/page) — memoized so a
// parent re-render (e.g. another card's mutation settling) doesn't re-render
// every card. Only effective because LibraryView passes stable callback
// references (useCallback / raw useState setters), not fresh inline
// functions, for onEdit/onDelete/onStartReading.
export const BookCard = React.memo(function BookCard({
  book,
  compact = false,
  onEdit,
  onDelete,
  onStartReading,
}: {
  book: LibraryBook;
  compact?: boolean;
  onEdit: (book: LibraryBook) => void;
  onDelete: (book: LibraryBook) => void;
  onStartReading?: (book: LibraryBook) => void;
}) {
  const canStart =
    book.status === "WANT_TO_READ" || book.status === "ON_HOLD";
  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  // Compact: a lean, tappable card (whole card opens edit).
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onEdit(book)}
        className="group flex flex-col gap-2 text-left"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border bg-muted transition-shadow group-hover:shadow-md">
          <BookCover book={book} />
          <span
            className={cn(
              "absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              STATUS_DOT[book.status],
            )}
          />
          {book.favorite ? (
            <Heart className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-rose-500 text-rose-500" />
          ) : null}
        </div>
        <div className="px-0.5">
          <p className="line-clamp-2 font-display text-[13px] font-semibold leading-tight">
            {book.title}
          </p>
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {book.authors[0] ?? "Unknown"}
          </p>
        </div>
      </button>
    );
  }

  // Comfortable: full card with details and actions.
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <BookCover book={book} />
        {book.favorite ? (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex-1">
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight">
            {book.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
          </p>
        </div>

        <StatusBadge status={book.status} />

        {book.rating ? <StarRating value={book.rating} /> : null}

        {progress !== null && book.status === "CURRENTLY_READING" ? (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
            </p>
          </div>
        ) : null}

        {canStart && onStartReading ? (
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full border-warm/30 bg-warm/10 text-warm hover:bg-warm/20"
            onClick={() => onStartReading(book)}
          >
            <BookOpen className="h-3.5 w-3.5" /> Start reading
          </Button>
        ) : null}

        <div className="mt-1 flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1"
            onClick={() => onEdit(book)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 text-destructive hover:text-destructive"
            onClick={() => onDelete(book)}
            aria-label={`Delete ${book.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});
