"use client";

import Link from "next/link";
import { BookCover, CoverFrame, COVER_TRACK } from "@/components/BookCover";
import { ProgressBar } from "@/components/ui/bar";
import { cn } from "@/lib/utils";
import type { LibraryBook } from "@/lib/types";

type ShelfSize = "lg" | "xl";

// A single portrait book tile linking to its detail page. Extracted from
// HomeView so the dashboard shelves can reuse it.
//
// `size` exists because the same tile serves two jobs: a dashboard glance
// (lg) and Library's browsing shelves (xl), where covers are the content
// rather than a preview and a row of 88px thumbnails left most of a 1600px
// shell empty.
export function MiniBookCard({
  book,
  showTitle = true,
  showProgress = false,
  size = "lg",
}: {
  book: LibraryBook;
  showTitle?: boolean;
  showProgress?: boolean;
  size?: ShelfSize;
}) {
  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    <Link
      href={`/books/${book.id}`}
      className={cn("group flex shrink-0 flex-col gap-1.5", COVER_TRACK[size])}
    >
      <CoverFrame
        size={size}
        className="transition-[transform,box-shadow] group-hover:-translate-y-0.5 group-hover:shadow-card-hover"
      >
        <BookCover book={book} />
      </CoverFrame>
      {showTitle ? (
        // Always reserve two lines so a one-line title doesn't pull the
        // progress bar up and break the row's horizontal alignment.
        <p className="line-clamp-2 min-h-[2.5em] text-caption-sm font-medium leading-tight text-foreground/80">
          {book.title}
        </p>
      ) : null}
      {showProgress && progress !== null ? (
        <div className="space-y-0.5">
          <ProgressBar value={progress} className="h-1" />
          <p className="text-[10px] text-muted-foreground">{progress}%</p>
        </div>
      ) : null}
    </Link>
  );
}

// Horizontal, scrollbar-hidden row of book tiles.
export function BookScrollRow({
  books,
  showTitle = true,
  showProgress = false,
  size = "lg",
}: {
  books: LibraryBook[];
  showTitle?: boolean;
  showProgress?: boolean;
  size?: ShelfSize;
}) {
  if (books.length === 0) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {books.map((b) => (
        <MiniBookCard
          key={b.id}
          book={b}
          showTitle={showTitle}
          showProgress={showProgress}
          size={size}
        />
      ))}
    </div>
  );
}
