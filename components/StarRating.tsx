"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Read-only or interactive 1–5 star rating.
export function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number | null;
  onChange?: (next: number) => void;
  size?: number;
}) {
  const interactive = Boolean(onChange);
  // The star that was last clicked. Every star up to it pops, each a beat
  // after the last, so choosing a rating sweeps left-to-right instead of
  // snapping. Cleared afterwards so picking the same value replays it.
  const [popped, setPopped] = React.useState<number | null>(null);

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && n <= value;
        const popping = popped != null && n <= popped;
        const star = (
          <Star
            style={{
              width: size,
              height: size,
              // 40ms apart: enough to read as a sweep, short enough that the
              // whole gesture still resolves in under a third of a second.
              animationDelay: popping ? `${(n - 1) * 40}ms` : undefined,
            }}
            className={cn(
              "transition-colors",
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40",
              popping && "animate-[bt-star-pop_260ms_ease-out_both]",
            )}
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => {
              const next = n === value ? 0 : n;
              onChange!(next);
              setPopped(next || null);
              // Longest delay (4 × 40ms) plus the animation itself.
              window.setTimeout(() => setPopped(null), 440);
            }}
            className="rounded p-0.5 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
