import type * as React from "react";
import { cn } from "@/lib/utils";
import { TINTS } from "@/lib/constants";

// Compact metric tile: tinted icon badge, big value, small label.
// Numbers lead (design-system MASTER.md §5) — value first, label second.
export function Stat({
  icon,
  label,
  value,
  tint = "blue",
  caption,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tint?: keyof typeof TINTS;
  caption?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 shadow-card", className)}>
      <span
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full",
          TINTS[tint],
        )}
      >
        {icon}
      </span>
      <p className="mt-2.5 text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold">{value}</p>
      {caption ? (
        <p className="mt-0.5 text-caption-sm text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
