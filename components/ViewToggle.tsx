"use client";

import { LayoutGrid, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibraryViewMode = "comfortable" | "compact" | "list";

const OPTIONS: {
  mode: LibraryViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { mode: "comfortable", label: "Large covers", icon: LayoutGrid },
  { mode: "compact", label: "Compact grid", icon: Grid3x3 },
  { mode: "list", label: "List", icon: List },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: LibraryViewMode;
  onChange: (mode: LibraryViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border bg-card/80 p-0.5 backdrop-blur">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={cn(
              "flex h-8 w-9 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
