"use client";

import type * as React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Two forms, deliberately:
//   default — flush rows, clipped by the container (settings/navigation lists)
//   inset   — 1px of padding so rounded child rows show an inset hover
//             highlight (record lists: books, feedback, sessions)
export function ListContainer({
  children,
  inset = false,
  className,
}: {
  children: React.ReactNode;
  inset?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border/60 rounded-2xl border bg-card",
        inset ? "p-1" : "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

const ROW_CLASS =
  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

// One settings/navigation row for the whole app. The Profile index and its own
// subpages previously used three variants of this that disagreed on padding
// (py-3 vs py-3.5), icon size (h-4 vs h-5), and trailing glyph (→ vs ›).
// `icon` is a Lucide component rather than a node so the size can't drift.
export function ListRow({
  icon: Icon,
  label,
  description,
  trailing,
  href,
  onClick,
  chevron = true,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
}) {
  const inner = (
    <>
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {description ? (
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {trailing ? (
        <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span>
      ) : null}
      {chevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={ROW_CLASS}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {inner}
    </button>
  );
}
