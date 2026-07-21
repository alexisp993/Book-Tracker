"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Heart, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import { ProgressBar } from "@/components/ui/bar";
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

  // Compact: a lean, tappable card — tapping navigates to detail.
  if (compact) {
    return (
      <Link
        href={`/books/${book.id}`}
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
      </Link>
    );
  }

  // Comfortable: full card with details and actions. The cover and text area
  // link to the detail page; the action buttons stay as separate tap targets.
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-shadow hover:shadow-md">
      <Link href={`/books/${book.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-muted block">
        <BookCover book={book} />
        <StatusBadge
          status={book.status}
          overlay
          className="absolute left-2 top-2 text-[11px]"
        />
        {book.favorite ? (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur-md">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={`/books/${book.id}`} className="flex-1">
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-tight">
            {book.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
            </p>
            {book.rating ? (
              <StarRating value={book.rating} size={11} />
            ) : null}
          </div>
        </Link>

        {progress !== null && book.status === "CURRENTLY_READING" ? (
          <div>
            <ProgressBar value={progress} />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
            </p>
          </div>
        ) : null}

        <div className="mt-1 flex items-center gap-1.5">
          {canStart && onStartReading ? (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-warm/30 bg-warm/10 text-warm hover:bg-warm/20"
              onClick={() => onStartReading(book)}
              aria-label={`Start reading ${book.title}`}
            >
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(book)}
            aria-label={`Edit ${book.title}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
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
