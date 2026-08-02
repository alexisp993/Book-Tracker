"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import type { LibraryBook } from "@/lib/types";

// Cover image that walks the candidate list, skipping load errors and tiny
// placeholder images (Amazon serves a 1x1 GIF with HTTP 200 when it has no cover).
export function BookCover({
  book,
  className,
}: {
  book: LibraryBook;
  className?: string;
}) {
  const candidates = book.coverCandidates;
  const [idx, setIdx] = React.useState(0);
  const src = candidates[idx];
  const advance = () => setIdx((i) => i + 1);

  // Reset when the book changes (e.g. list re-sort).
  React.useEffect(() => setIdx(0), [book.id]);

  if (!src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground">
        <BookOpen className="h-6 w-6 opacity-30" />
        <span className="line-clamp-3 text-caption-sm font-medium leading-tight">
          {book.title}
        </span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={`Cover of ${book.title}`}
      className={className ?? "h-full w-full object-cover"}
      loading="lazy"
      onError={advance}
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 2) advance();
      }}
    />
  );
}
