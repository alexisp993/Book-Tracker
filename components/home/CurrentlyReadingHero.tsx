"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { BookCover, CoverFrame } from "@/components/BookCover";
import { ProgressBar } from "@/components/ui/bar";
import { Band } from "@/components/ui/section";
import { useBooks, useSessionStats } from "@/lib/queries";
import type { LibraryBook } from "@/lib/types";

// Home's display moment.
//
// This replaces ContinueReadingCard on Home, and the difference is the point:
// the card put a 132px cover in a bordered box beside a goal donut of equal
// visual weight, so the book you are actually reading ranked the same as a
// progress widget. Here the cover is the largest object on the page, the title
// is set at display size in the serif, and nothing is boxed — the composition
// is carried by scale and alignment.
//
// ContinueReadingCard is left in place for any other caller; this component is
// Home-specific on purpose.
export function CurrentlyReadingHero({
  onContinue,
}: {
  onContinue: (book: LibraryBook) => void;
}) {
  const { data } = useBooks({ status: "CURRENTLY_READING", pageSize: 50 });
  const { data: sessionStats } = useSessionStats();

  const books = data?.items ?? [];

  // The grid used to swallow a null section silently. A fixed composition can't
  // — a hole where the hero belongs reads as breakage — so an empty shelf gets
  // an authored invitation instead.
  if (books.length === 0) {
    return (
      <Band label="Currently reading" divider={false}>
        <div className="max-w-md">
          <p className="font-display text-2xl leading-snug">
            Nothing on the go right now.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pick something from your shelves and it will show up here, with your
            place kept.
          </p>
          <Link
            href="/library"
            className="mt-4 inline-flex items-center gap-1.5 border-b border-primary/40 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary"
          >
            Browse your library <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Band>
    );
  }

  const book = books.reduce((latest, b) =>
    new Date(b.updatedAt) > new Date(latest.updatedAt) ? b : latest,
  );

  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;
  const pagesLeft = book.pageCount ? book.pageCount - book.currentPage : null;
  // avgPagesPerHour is a per-hour rate, so pagesLeft / rate is hours of reading
  // remaining — not days. Rounded to the nearest half hour so a sparse history
  // doesn't produce a falsely precise-looking number.
  const estimatedHours =
    pagesLeft && pagesLeft > 0 && sessionStats?.avgPagesPerHour
      ? Math.max(0.5, Math.round((pagesLeft / sessionStats.avgPagesPerHour) * 2) / 2)
      : null;

  return (
    <Band label="Currently reading" divider={false}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-9">
        <Link href={`/books/${book.id}`} className="group shrink-0 self-start">
          <CoverFrame
            size="hero"
            className="transition-[transform,box-shadow] group-hover:-translate-y-1 group-hover:shadow-card-hover"
          >
            <BookCover book={book} />
          </CoverFrame>
        </Link>

        <div className="min-w-0 flex-1 pb-1">
          <Link href={`/books/${book.id}`} className="group block">
            <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance transition-colors group-hover:text-primary sm:text-[2.75rem]">
              {book.title}
            </h2>
          </Link>
          <p className="mt-2 font-display text-lg italic text-muted-foreground">
            {book.authors.join(", ") || "Unknown author"}
          </p>

          {progress !== null ? (
            <div className="mt-6 max-w-sm">
              <ProgressBar value={progress} className="h-1 rounded-none" />
              <p className="mt-2.5 text-sm text-muted-foreground">
                <span className="text-foreground">{book.currentPage}</span> of{" "}
                {book.pageCount} pages
                {estimatedHours ? (
                  <> · about {estimatedHours}h left at your pace</>
                ) : null}
              </p>
            </div>
          ) : null}

          {/* A text-and-rule affordance rather than a filled pill: the cover is
              already the loudest thing here, and a solid button beside it would
              compete for the same attention. */}
          <button
            type="button"
            onClick={() => onContinue(book)}
            className="mt-6 inline-flex items-center gap-2 border-b border-primary/40 pb-1 font-display text-lg text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="h-4 w-4" />
            Continue reading
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Band>
  );
}
