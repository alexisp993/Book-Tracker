import type * as React from "react";
import type { LucideIcon } from "lucide-react";

// Shared empty-state pattern (icon, headline, subtext, optional primary
// action) — currently adopted by the Library page; other screens
// (Sessions, Shelves, Collections, Stats) each still inline their own
// border-dashed markup and will switch to this in their own later phases.
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </span>
      <div>
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
