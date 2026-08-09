import type * as React from "react";
import { cn } from "@/lib/utils";

// A labelled region of the page — heading, optional subtitle, optional
// trailing action — with NO border, background, shadow or padding.
//
// This exists because `Card` was doing two unrelated jobs: it is both an
// elevated surface *and* the only way to get a section heading. Anything
// needing a title therefore got a box for free, which is why the app read as
// boxes inside boxes. HomeView's `insights` case had already hand-rolled this
// component to escape that, and its copy of the heading classes had drifted.
//
// The rule: `Card` when the content is a bounded object you could pick up and
// move (one book's continue-reading tile, a note). `Section` when it is a
// labelled region of the page (a shelf of covers, a row of metrics).
//
// `Card` composes this for its own header, so the two can never drift again.
export function SectionHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <div className="min-w-0">
        {/* Only becomes a flex container when there's an icon to align —
            otherwise a plain block h2, so baseline alignment against a
            trailing action behaves exactly as it did before. */}
        <h2
          className={cn(
            "font-display text-lg font-semibold",
            icon && "flex items-center gap-1.5",
          )}
        >
          {icon}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  actions,
  icon,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
          icon={icon}
        />
      ) : null}
      {children}
    </section>
  );
}
