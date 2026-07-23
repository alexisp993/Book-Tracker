"use client";

import * as React from "react";
import { BookOpen, Heart, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibraryBook } from "@/lib/types";

// The shared kebab (⋮) action menu for a book, used by both the grid card and
// the list row so their actions stay identical. Local outside-click/escape
// state; each item is only rendered when its handler is provided.
export function BookActionsMenu({
  book,
  onStartReading,
  onEdit,
  onToggleFavorite,
  onDelete,
  className,
}: {
  book: LibraryBook;
  onStartReading?: (book: LibraryBook) => void;
  onEdit?: (book: LibraryBook) => void;
  onToggleFavorite?: (book: LibraryBook) => void;
  onDelete?: (book: LibraryBook) => void;
  className?: string;
}) {
  const canStart = book.status === "WANT_TO_READ" || book.status === "ON_HOLD";
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Actions for ${book.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-40 origin-top-right overflow-hidden rounded-xl border bg-card py-1 shadow-lg animate-[bt-menu-in_140ms_ease-out]"
        >
          {canStart && onStartReading ? (
            <Item
              onClick={() => {
                setOpen(false);
                onStartReading(book);
              }}
              className="text-warm"
            >
              <BookOpen className="h-3.5 w-3.5" /> Start reading
            </Item>
          ) : null}
          {onEdit ? (
            <Item
              onClick={() => {
                setOpen(false);
                onEdit(book);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Item>
          ) : null}
          {onToggleFavorite ? (
            <Item
              onClick={() => {
                setOpen(false);
                onToggleFavorite(book);
              }}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  book.favorite ? "fill-rose-500 text-rose-500" : "",
                )}
              />
              {book.favorite ? "Unfavorite" : "Favorite"}
            </Item>
          ) : null}
          {onDelete ? (
            <Item
              onClick={() => {
                setOpen(false);
                onDelete(book);
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Item>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Item({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
        className,
      )}
    >
      {children}
    </button>
  );
}
