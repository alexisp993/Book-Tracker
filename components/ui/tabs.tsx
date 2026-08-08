"use client";

import * as React from "react";
import { cn, hitArea } from "@/lib/utils";

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
//
// The active thumb is one real element that slides/resizes to the selected
// tab's measured position, instead of each tab independently toggling its
// own background — a hard on/off swap reads as a computer redrawing pixels;
// a single thumb that moves reads as one physical object relocating. Width
// tracks each tab's own label length rather than an even 1/n split, so short
// and long labels both get a snug, correctly-sized indicator. Global CSS
// already collapses transition-duration under prefers-reduced-motion, so
// this degrades to an instant swap there with no extra handling needed.
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
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = React.useState<{ left: number; width: number } | null>(null);
  const activeIndex = items.findIndex((t) => t.value === value);

  const measure = React.useCallback(() => {
    const el = tabRefs.current[activeIndex];
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeIndex]);

  React.useLayoutEffect(measure, [measure]);
  React.useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      className={cn("relative flex gap-1 rounded-xl bg-muted p-1", className)}
      role="tablist"
    >
      {thumb ? (
        <div
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-lg bg-card shadow-sm transition-[transform,width] duration-300 ease-out"
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      ) : null}
      {items.map((t, i) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative z-10 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
              // 32px visually, 44px to a fingertip. Safe despite sitting
              // adjacent: every tab is wider than 44px, so `min-w-full` in
              // hitArea wins and the region never grows sideways into its
              // neighbour — it only expands vertically, into the row's gap.
              hitArea,
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon ? (
              <span className="inline-flex items-center gap-1.5">
                {t.icon}
                {t.label}
              </span>
            ) : (
              t.label
            )}
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
        sm && "gap-1.5",
        // `scrollable` means "keep it one line and let it scroll" — letting
        // `sm`'s flex-wrap also apply would silently cancel that (wrapped
        // items never overflow, so there'd be nothing to scroll).
        sm && !scrollable && "flex-wrap",
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
              // Same reasoning as SegmentedTabs above: pills run 61-111px
              // wide, comfortably past 44, so the hit region only grows
              // vertically and can't steal a neighbour's tap.
              hitArea,
              // `sm` was py-1 (24px tall) — exactly on the WCAG 2.5.8 floor
              // and well under MASTER.md §A3's own 44px rule. These sit in a
              // dense scrolling row, so an expanded invisible hit area would
              // overlap its neighbours; py-2 buys real height (32px) instead.
              sm ? "px-3 py-2 text-xs" : "px-3.5 py-1.5 text-sm",
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
