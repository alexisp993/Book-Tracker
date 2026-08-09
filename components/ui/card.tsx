import type * as React from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section";

// THE card surface for the whole app. Depth comes from a soft two-layer
// elevation (--shadow-1, defined per theme) over a card surface that sits
// clearly above the page background — border alone read as flat. See
// design-system MASTER.md §6.4. `title` is optional so this covers both titled
// sections and plain content panels — previously those were 46 hand-written
// wrappers across five different paddings.
//
// Reach for `Section` instead when the content is a labelled region of the
// page rather than a bounded object — a shelf of covers does not need a box
// around it. The heading markup is shared with `Section` so the two can't
// drift; note that a Card's `subtitle` sits to the RIGHT of the title (a
// chart caption, "Last 12 months"), whereas a Section's sits beneath it.
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
        <SectionHeader
          title={title}
          className="mb-4"
          // Card's subtitle is a right-aligned caption, not a stacked
          // description, so it goes through the actions slot rather than
          // SectionHeader's own `subtitle`.
          actions={
            actions ??
            (subtitle ? (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            ) : null)
          }
        />
      ) : null}
      {children}
    </div>
  );
}
