"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibraryBook } from "@/lib/types";

// One cover scale for the whole app.
//
// Covers were previously boxed by each caller, which produced seven different
// treatments across five radii and three shadow states — a 40x56 rounded-md
// thumbnail in a list row, an 88x132 rounded-xl with shadow-cover in a shelf,
// a cover with no shadow at all inside a comfortable card. Radius genuinely
// has to scale with the box (rounded-xl on a 32px-wide thumb looks like a
// pill), so the fix is a named scale rather than one forced value.
//
// Every size carries shadow-cover: MASTER.md §3 makes books physical objects,
// and that is the app's strongest depth cue.
const COVER_SIZES = {
  xs: "h-12 w-8 rounded",
  sm: "h-14 w-10 rounded-md",
  md: "h-24 w-16 rounded-lg",
  lg: "h-[132px] w-[88px] rounded-xl",
  /** Browsing size — Library's shelves, where covers are the content. */
  xl: "h-[186px] w-[124px] rounded-xl",
  /**
   * The one book on the page that matters most. Sized so the cover, not the
   * heading, is the first thing the eye lands on — a reading app's display
   * moment is a book, not type.
   */
  hero: "h-[228px] w-[152px] rounded-xl sm:h-[276px] sm:w-[184px]",
  /** Fills its container at the true 2:3 book ratio. */
  fill: "aspect-[2/3] w-full rounded-xl",
} as const;

/** Track width for a shelf tile, matched to each cover box. */
export const COVER_TRACK: Record<"lg" | "xl", string> = {
  lg: "w-[88px]",
  xl: "w-[124px]",
};

export type CoverSize = keyof typeof COVER_SIZES;

/**
 * The framed box a cover sits in — border, clipping, ratio, elevation.
 * Takes a BookCover (or any image element) as its child.
 */
export function CoverFrame({
  size = "fill",
  className,
  interactive = false,
  children,
}: {
  size?: CoverSize;
  className?: string;
  /**
   * Adds the pick-it-up response — a lift, a slight tilt, and a deeper
   * shadow under the cursor. Opt-in because a cover that isn't a link
   * shouldn't pretend to be one (the hero on Book Detail, for instance,
   * goes nowhere).
   */
  interactive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border bg-muted shadow-cover",
        // Books are objects. A shelf where nothing responds to the cursor is
        // a picture of a shelf; this makes the covers feel liftable without
        // any of the tilt-card excess — 4px up, one degree over.
        interactive &&
          "transition-[transform,box-shadow] duration-200 ease-out will-change-transform group-hover:-translate-y-1 group-hover:rotate-[-1deg] group-hover:shadow-card-hover group-focus-visible:-translate-y-1",
        COVER_SIZES[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

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
