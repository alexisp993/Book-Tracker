"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Heart, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/BookCover";
import { StarRating } from "@/components/StarRating";
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
}: {
  book: LibraryBook;
  onEdit?: (book: LibraryBook) => void;
  onDelete?: (book: LibraryBook) => void;
  onStartReading?: (book: LibraryBook) => void;
}) {
  const canStart = book.status === "WANT_TO_READ" || book.status === "ON_HOLD";
  const progress =
    book.status === "CURRENTLY_READING" && book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

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
            <span className={cn("text-[11px] font-medium", STATUS_TEXT[book.status])}>
              {STATUS_LABELS[book.status]}
            </span>
            {book.rating ? <StarRating value={book.rating} size={12} /> : null}
            {book.favorite ? (
              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
            ) : null}
          </div>
        )}
      </div>

      {/* Kebab actions — a separate tap target so it never triggers the
          row-level navigation Link above. */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setMenuOpen((v) => !v);
          }}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          aria-label={`Actions for ${book.title}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border bg-card py-1 shadow-lg"
          >
            {canStart && onStartReading ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onStartReading(book);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-warm transition-colors hover:bg-secondary"
              >
                <BookOpen className="h-3.5 w-3.5" /> Start reading
              </button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(book);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(book);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
