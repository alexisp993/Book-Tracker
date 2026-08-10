"use client";

import * as React from "react";
import { Heart, X } from "lucide-react";
import { BookCover, CoverFrame } from "@/components/BookCover";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import { useGoals, useSessions, useUpdateBook } from "@/lib/queries";
import { cn, formatDuration } from "@/lib/utils";
import type { LibraryBook } from "@/lib/types";

// Finishing a book.
//
// Until now this event had no design at all: a cover silently moved from one
// row to another. It is the highest-emotion moment in a reading life and the
// only one that can't be repeated for a given book, which is why it gets the
// app's single real flourish — the seal — rather than the generic checkmark
// the session-saved confirmation uses.
//
// Everything stated here is real. Pages come from the book, sessions and time
// from that book's own session rows, elapsed days from startDate. Any of them
// that isn't known is simply left out, the same rule YearInReading follows —
// a finishing moment that inflates its own numbers is worse than none.

// A wax seal, drawn rather than imported: scalloped edge, ring, and the
// finish year struck in the middle. Lucide has no seal and this only ever
// appears here, so a shipped asset would cost more than the ~20 lines.
function Seal({ year }: { year: number }) {
  // 24 scallops around the rim. Generated rather than hand-authored so the
  // spacing is exact.
  const scallops = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return { cx: 50 + Math.cos(a) * 42, cy: 50 + Math.sin(a) * 42 };
  });
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      {scallops.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r="6" fill="hsl(var(--warm))" />
      ))}
      <circle cx="50" cy="50" r="44" fill="hsl(var(--warm))" />
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="hsl(var(--warm-foreground) / 0.55)"
        strokeWidth="1.5"
      />
      <text
        x="50"
        y="44"
        textAnchor="middle"
        className="font-display"
        fontSize="13"
        fontWeight="600"
        letterSpacing="1.5"
        fill="hsl(var(--warm-foreground))"
      >
        FINISHED
      </text>
      <text
        x="50"
        y="63"
        textAnchor="middle"
        className="font-display"
        fontSize="16"
        fontWeight="600"
        fill="hsl(var(--warm-foreground))"
      >
        {year}
      </text>
    </svg>
  );
}

export function FinishedMoment({
  book,
  onClose,
  onNotYet,
}: {
  book: LibraryBook;
  onClose: () => void;
  /** Rendered as an escape hatch when the finish was only *offered*, not asked
   *  for — i.e. we guessed from the page count and might be wrong. */
  onNotYet?: () => void;
}) {
  const [rating, setRating] = React.useState<number>(book.rating ?? 0);
  const [favorite, setFavorite] = React.useState<boolean>(book.favorite);
  const [error, setError] = React.useState<string | null>(null);
  const updateMutation = useUpdateBook();

  const { data: sessionData } = useSessions({
    userBookId: book.id,
    pageSize: 50,
  });
  const { data: goals } = useGoals();

  const sessions = sessionData?.items ?? [];
  const sessionCount = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);

  const days = React.useMemo(() => {
    if (!book.startDate) return null;
    const start = new Date(book.startDate).getTime();
    const d = Math.round((Date.now() - start) / 86_400_000);
    return d >= 1 ? d : null;
  }, [book.startDate]);

  // Only real facts, and only the ones we actually have.
  const record: string[] = [];
  if (book.pageCount) record.push(`${book.pageCount.toLocaleString()} pages`);
  if (sessionCount > 0) {
    record.push(`${sessionCount} sitting${sessionCount === 1 ? "" : "s"}`);
  }
  if (totalMinutes > 0) record.push(formatDuration(totalMinutes));

  const year = new Date().getFullYear();
  const booksGoal = goals?.find(
    (g) => g.type === "BOOKS" && (g.year === year || g.year === null),
  );
  // The goal's `progress` is the count *before* this book lands, so finishing
  // this one is what tips it over.
  const goalReachedNow =
    booksGoal && booksGoal.progress + 1 === booksGoal.target ? booksGoal : null;
  const goalRemaining =
    booksGoal && booksGoal.progress + 1 < booksGoal.target
      ? booksGoal.target - (booksGoal.progress + 1)
      : null;

  async function handleDone() {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id: book.id,
        input: {
          status: "READ",
          // The API stamps finishDate itself on the transition into READ.
          ...(rating > 0 ? { rating } : {}),
          favorite,
        },
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Couldn't save. Your reading is still recorded — try again.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] animate-[bt-overlay-in_200ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={`You finished ${book.title}`}
    >
      <div className="flex justify-end px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onNotYet ?? onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 pb-12">
        {/* Cover + seal. The seal is absolutely positioned over the lower-right
            of the cover so it reads as struck onto the book, not floating
            beside it. */}
        <div className="relative animate-[bt-seal-impact_900ms_ease-out_both]">
          <CoverFrame size="hero">
            <BookCover book={book} />
          </CoverFrame>
          {/* The settle is choreographed in the keyframes themselves (see
              bt-seal-stamp), so the timing function stays a clean decelerate.
              An overshooting cubic-bezier on top of overshooting keyframes
              compounds into rubber. */}
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 animate-[bt-seal-stamp_700ms_cubic-bezier(0.22,1,0.36,1)_150ms_both] drop-shadow-lg sm:-bottom-6 sm:-right-6 sm:h-28 sm:w-28">
            <Seal year={year} />
          </div>
        </div>

        <div className="max-w-lg animate-[bt-rise-in_320ms_ease-out_500ms_both] text-center">
          <p className="text-caption-sm font-medium uppercase tracking-[0.12em] text-warm">
            You finished
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-4xl">
            {book.title}
          </h1>
          <p className="mt-1.5 font-display text-lg italic text-muted-foreground">
            {book.authors.join(", ") || "Unknown author"}
          </p>

          {record.length > 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {record.join(" · ")}
              {days ? <>, over {days} days</> : null}
            </p>
          ) : null}

          {goalReachedNow ? (
            <p className="mt-3 text-sm font-medium text-warm">
              That&rsquo;s your goal of {goalReachedNow.target} books for {year}.
            </p>
          ) : goalRemaining ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {goalRemaining} more to reach your goal for {year}.
            </p>
          ) : null}
        </div>

        {/* The one moment a reader actually has an opinion. Rating lives in the
            edit form otherwise, which is why almost nothing is ever rated. */}
        <div className="flex animate-[bt-rise-in_320ms_ease-out_640ms_both] flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">How was it?</p>
          <StarRating value={rating || null} onChange={setRating} size={34} />
          <button
            type="button"
            onClick={() => setFavorite((v) => !v)}
            aria-pressed={favorite}
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              favorite
                ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Heart className={cn("h-4 w-4", favorite && "fill-rose-500 text-rose-500")} />
            {favorite ? "One of your favourites" : "Add to favourites"}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex animate-[bt-rise-in_320ms_ease-out_780ms_both] flex-col items-center gap-3">
          <Button
            onClick={handleDone}
            disabled={updateMutation.isPending}
            className="px-6"
          >
            {updateMutation.isPending ? "Saving…" : "Add it to the shelf"}
          </Button>
          {onNotYet ? (
            // Only shown when we *guessed* from the page count. Metadata page
            // counts are frequently wrong, so the reader must be able to say so
            // without the book being marked read behind their back.
            <button
              type="button"
              onClick={onNotYet}
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Not yet — I&rsquo;m still reading
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
