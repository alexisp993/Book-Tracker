import type * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// THE screen title. The app previously carried two competing specs —
// `text-3xl font-semibold sm:text-4xl` in 10 page.tsx files and
// `text-2xl font-bold` in 5 view components. This is the one that wins, and
// it always lives in the view component, never in page.tsx.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

// Back affordance + title, for any screen reached from another screen.
// A real <Link> rather than router.push so middle-click and open-in-new-tab
// behave. Previously hand-rolled in five places.
export function BackHeader({
  href,
  backLabel = "Back",
  title,
  subtitle,
  actions,
}: {
  href: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      {title ? (
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
      ) : null}
    </div>
  );
}
