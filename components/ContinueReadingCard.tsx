"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/BookCover";
import { useBooks, useSessionStats } from "@/lib/queries";
import type { LibraryBook } from "@/lib/types";

// Surfaces the book most recently picked up, front-and-center above the
// library list — the "what should I do next" answer for the most common
// case (you're already mid-book). Hidden entirely when nothing's in
// progress; no new endpoint, just the existing CURRENTLY_READING query.
export function ContinueReadingCard({
  onContinue,
}: {
  onContinue: (book: LibraryBook) => void;
}) {
  const { data } = useBooks({ status: "CURRENTLY_READING", pageSize: 50 });
  const { data: sessionStats } = useSessionStats();

  const books = data?.items ?? [];
  if (books.length === 0) return null;

  const book = books.reduce((latest, b) =>
    new Date(b.updatedAt) > new Date(latest.updatedAt) ? b : latest,
  );

  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;
  const pagesLeft = book.pageCount ? book.pageCount - book.currentPage : null;
  // avgPagesPerHour is a per-hour rate, so pagesLeft / rate is hours of
  // reading remaining — not days. Round to the nearest half hour so a
  // sparse history doesn't produce a falsely precise-looking number.
  const estimatedHours =
    pagesLeft && pagesLeft > 0 && sessionStats?.avgPagesPerHour
      ? Math.max(0.5, Math.round((pagesLeft / sessionStats.avgPagesPerHour) * 2) / 2)
      : null;

  return (
    <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
        <BookCover book={book} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          Continue reading
        </p>
        <p className="line-clamp-1 font-display text-base font-semibold leading-tight">
          {book.title}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {book.authors.join(", ") || "Unknown author"}
        </p>
        {progress !== null ? (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {book.currentPage}/{book.pageCount} pages · {progress}%
              {estimatedHours
                ? ` · ~${estimatedHours}h left at your pace`
                : ""}
            </p>
          </div>
        ) : null}
      </div>
      <Button
        size="sm"
        className="shrink-0"
        onClick={() => onContinue(book)}
      >
        <BookOpen className="h-3.5 w-3.5" /> Continue
      </Button>
    </div>
  );
}
