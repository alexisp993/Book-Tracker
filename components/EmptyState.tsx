import type * as React from "react";
import type { LucideIcon } from "lucide-react";

// Shared empty-state pattern (icon, headline, subtext, optional primary
// action) — used by Library, Notes, Sessions, Book detail, and the feedback
// screens so every empty view has the same calm, intentional treatment.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary ring-4 ring-secondary/40">
        <Icon className="h-6 w-6 text-muted-foreground/70" strokeWidth={1.6} />
      </span>
      <div className="max-w-sm">
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
