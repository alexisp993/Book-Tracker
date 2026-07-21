import type * as React from "react";
import { cn } from "@/lib/utils";

// Horizontal label + track + count row. Previously copy-pasted four times
// (status / ratings / genres in StatsView, plus MoodBreakdown) with a
// byte-identical track.
export function BarRow({
  label,
  value,
  max,
  fillClass = "bg-primary",
  labelClassName = "w-28",
}: {
  label: React.ReactNode;
  value: number;
  max: number;
  fillClass?: string;
  labelClassName?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "shrink-0 truncate text-xs text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-medium">{value}</span>
    </div>
  );
}

// THE reading-progress bar. One height everywhere — this concept previously
// rendered at h-1.5, h-2, and h-2.5 depending on the screen.
export function ProgressBar({
  value,
  max = 100,
  fillClass = "bg-primary",
  className,
}: {
  value: number;
  max?: number;
  fillClass?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", fillClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
