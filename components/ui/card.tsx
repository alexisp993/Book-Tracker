import type * as React from "react";
import { cn } from "@/lib/utils";

// THE card surface for the whole app. Depth comes from a soft two-layer
// elevation (--shadow-1, defined per theme) over a card surface that sits
// clearly above the page background — border alone read as flat. See
// design-system MASTER.md §6.4. `title` is optional so this covers both titled
// sections and plain content panels — previously those were 46 hand-written
// wrappers across five different paddings.
export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card sm:p-5", className)}>
      {title ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {actions ?? (subtitle ? (
            <span className="shrink-0 text-xs text-muted-foreground">{subtitle}</span>
          ) : null)}
        </div>
      ) : null}
      {children}
    </div>
  );
}
