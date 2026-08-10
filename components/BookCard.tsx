"use client";

import * as React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";
import { ProgressBar } from "@/components/ui/bar";
import { BookCover, CoverFrame } from "@/components/BookCover";
import { BookActionsMenu } from "@/components/BookActionsMenu";
import { STATUS_DOT, STATUS_LABELS, STATUS_TEXT } from "@/lib/constants";
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
  onMarkFinished,
  onToggleFavorite,
}: {
  book: LibraryBook;
  compact?: boolean;
  onEdit: (book: LibraryBook) => void;
  onDelete: (book: LibraryBook) => void;
  onStartReading?: (book: LibraryBook) => void;
  onMarkFinished?: (book: LibraryBook) => void;
  onToggleFavorite?: (book: LibraryBook) => void;
}) {
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
        <CoverFrame
          size="fill"
          className="relative transition-[transform,box-shadow] group-hover:-translate-y-0.5 group-hover:shadow-card-hover"
        >
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
        </CoverFrame>
        <div className="px-0.5">
          <p className="line-clamp-2 font-display text-[13px] font-semibold leading-tight">
            {book.title}
          </p>
          <p className="line-clamp-1 text-caption-sm text-muted-foreground">
            {book.authors[0] ?? "Unknown"}
          </p>
        </div>
      </Link>
    );
  }

  // Comfortable: the same book, larger, with its shelf context.
  //
  // This used to be a bordered card with the cover boxed inside it, which made
  // a book look like a product tile and put a frame around artwork that is
  // already a designed object. The cover now leads and carries its own
  // elevation; the metadata sits under it on the page ground.
  //
  // Status was previously stated three times over (an overlay badge on the
  // cover, a coloured dot, and a text label). It now appears once, and only
  // when it isn't already implied: a progress bar means currently-reading and
  // a star rating means read, so the label is reserved for the shelves that
  // show neither.
  const impliedByMeta =
    (progress !== null && book.status === "CURRENTLY_READING") ||
    (book.status === "READ" && !!book.rating);

  return (
    <div className="group flex flex-col gap-2.5">
      <Link href={`/books/${book.id}`} className="block">
        <CoverFrame
          size="fill"
          className="relative transition-[transform,box-shadow] group-hover:-translate-y-0.5 group-hover:shadow-card-hover"
        >
          <BookCover book={book} />
          {book.favorite ? (
            <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur-md">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            </span>
          ) : null}
        </CoverFrame>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <Link href={`/books/${book.id}`} className="flex-1">
          <h3 className="line-clamp-2 font-display text-title-sm font-semibold leading-tight">
            {book.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
          </p>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            {progress !== null && book.status === "CURRENTLY_READING" ? (
              <>
                <ProgressBar value={progress} />
                <p className="mt-1 text-caption-sm text-muted-foreground">
                  {book.currentPage}/{book.pageCount} pages · {progress}%
                </p>
              </>
            ) : book.status === "READ" && book.rating ? (
              <StarRating value={book.rating} size={13} />
            ) : null}
            {impliedByMeta ? null : (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-caption-sm font-medium",
                  STATUS_TEXT[book.status],
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[book.status])} />
                {STATUS_LABELS[book.status]}
              </span>
            )}
          </div>
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
    </div>
  );
});
