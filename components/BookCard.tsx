"use client";

import * as React from "react";
import { BookOpen, Heart, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StarRating } from "@/components/StarRating";
import type { LibraryBook } from "@/lib/types";

export function BookCard({
  book,
  onEdit,
  onDelete,
}: {
  book: LibraryBook;
  onEdit: (book: LibraryBook) => void;
  onDelete: (book: LibraryBook) => void;
}) {
  // Walk the ordered cover-candidate list, advancing on a load error OR a tiny
  // placeholder image (Amazon serves a 1x1 GIF with HTTP 200 when it has no cover).
  const candidates = book.coverCandidates;
  const [coverIdx, setCoverIdx] = React.useState(0);
  const currentCover = candidates[coverIdx];
  const showCover = Boolean(currentCover);
  const advanceCover = () => setCoverIdx((i) => i + 1);

  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentCover}
            src={currentCover}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={advanceCover}
            onLoad={(e) => {
              // Reject tiny placeholder images (e.g. Amazon's 1x1 "no cover" GIF).
              if (e.currentTarget.naturalWidth <= 2) advanceCover();
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-40" />
            <span className="line-clamp-3 text-xs font-medium">
              {book.title}
            </span>
          </div>
        )}
        {book.favorite ? (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 backdrop-blur">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
            {book.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
          </p>
        </div>

        <StatusBadge status={book.status} />

        {book.rating ? <StarRating value={book.rating} /> : null}

        {progress !== null && book.status === "CURRENTLY_READING" ? (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-primary")}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
            </p>
          </div>
        ) : null}

        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1"
            onClick={() => onEdit(book)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(book)}
            aria-label={`Delete ${book.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
