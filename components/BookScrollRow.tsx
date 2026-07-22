"use client";

import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { ProgressBar } from "@/components/ui/bar";
import type { LibraryBook } from "@/lib/types";

// A single portrait book tile linking to its detail page. Extracted from
// HomeView so the dashboard shelves can reuse it.
export function MiniBookCard({
  book,
  showTitle = true,
  showProgress = false,
}: {
  book: LibraryBook;
  showTitle?: boolean;
  showProgress?: boolean;
}) {
  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex w-[88px] shrink-0 flex-col gap-1.5"
    >
      <div className="h-[132px] w-[88px] overflow-hidden rounded-xl border bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
        <BookCover book={book} />
      </div>
      {showTitle ? (
        <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground/80">
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
}: {
  books: LibraryBook[];
  showTitle?: boolean;
  showProgress?: boolean;
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
        />
      ))}
    </div>
  );
}
