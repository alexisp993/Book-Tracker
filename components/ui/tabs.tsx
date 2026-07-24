"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  /** Optional leading icon, rendered before the label (Notes' type chips). */
  icon?: React.ReactNode;
}

// Enclosed segmented control — the primary "switch the whole view" pattern.
// Replaces two variants that disagreed on whether the track was `bg-muted` or
// `bg-muted/50 + border`, and whether the active thumb was `bg-card` or
// `bg-background`.
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  items: readonly TabItem<T>[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-xl bg-muted p-1", className)} role="tablist">
      {items.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Free-standing pill filters. `size="sm"` is the secondary refinement row
// (Notes' type chips) — deliberately lighter than the primary row so the two
// filter levels stay visually ranked.
export function FilterPills<T extends string>({
  value,
  onChange,
  items,
  size = "default",
  scrollable = false,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  items: readonly TabItem<T>[];
  size?: "default" | "sm";
  scrollable?: boolean;
  className?: string;
}) {
  const sm = size === "sm";
  return (
    <div
      className={cn(
        "flex gap-1",
        sm && "flex-wrap gap-1.5",
        scrollable &&
          "overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sm ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              active
                ? sm
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground text-background"
                : sm
                  ? "bg-muted text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
