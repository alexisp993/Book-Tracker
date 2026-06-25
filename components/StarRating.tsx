"use client";

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
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && n <= value;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange!(n === value ? 0 : n)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
