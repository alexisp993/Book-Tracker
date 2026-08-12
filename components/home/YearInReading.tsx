"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Band } from "@/components/ui/section";
import { useGoals, useSessionStats, useStats } from "@/lib/queries";
import { cn, formatDuration } from "@/lib/utils";

// The year, told as a sentence and a shape.
//
// This replaces four KPI tiles, a four-tile insights grid, and a goal donut
// with three derived metrics ("143 Days left / 0.1 Avg/month / 9 Books to go").
// Those numbers were mostly arithmetic performed *at* the reader rather than
// information they asked for — and avgPerMonth floored its divisor at 1, so in
// January it was actively wrong.
//
// Everything here is real and already computed server-side. Nothing is
// fabricated, and anything absent is simply not rendered.
export function YearInReading() {
  const { data: stats } = useStats();
  const { data: session } = useSessionStats();
  const { data: goals } = useGoals();

  if (!stats) return null;

  const year = new Date().getFullYear();
  const yearGoal = goals?.find(
    (g) => g.type === "BOOKS" && (g.year === year || g.year === null),
  );
  const booksToGo = yearGoal
    ? Math.max(0, yearGoal.target - yearGoal.progress)
    : null;

  const months = stats.minutesPerMonth ?? [];
  const peak = Math.max(1, ...months.map((m) => m.minutes));
  const readAnything = months.some((m) => m.minutes > 0);

  // Read as prose, so the units carry the meaning rather than a label under a
  // number. Zero values are dropped instead of rendering "0 books".
  //
  // The counts animate up from zero via NumberFlow (already a dependency, and
  // already used on /profile/stats). It costs nothing and it makes the one
  // line of the page that is purely about *your* year feel like it's being
  // tallied rather than printed.
  const parts: { key: string; value: number; unit: string }[] = [];
  if (stats.booksThisYear > 0) {
    parts.push({
      key: "books",
      value: stats.booksThisYear,
      unit: stats.booksThisYear === 1 ? "book" : "books",
    });
  }
  if (stats.pagesThisYear > 0) {
    parts.push({ key: "pages", value: stats.pagesThisYear, unit: "pages" });
  }

  return (
    <Band label={`This year · ${year}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="min-w-0">
          <p className="font-display text-3xl leading-snug text-balance sm:text-4xl">
            {parts.length > 0 || stats.minutesThisYear > 0 ? (
              <>
                {parts.map((p, i) => (
                  <span key={p.key}>
                    {i > 0 ? (
                      <span className="text-muted-foreground"> · </span>
                    ) : null}
                    <NumberFlow value={p.value} /> {p.unit}
                  </span>
                ))}
                {stats.minutesThisYear > 0 ? (
                  <span>
                    {parts.length > 0 ? (
                      <span className="text-muted-foreground"> · </span>
                    ) : null}
                    {/* Duration stays formatted text — "6h 20m" isn't a single
                        number, and NumberFlow would have to tear it apart to
                        animate it. */}
                    {formatDuration(stats.minutesThisYear)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">
                Your year is still a blank page.
              </span>
            )}
          </p>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {booksToGo !== null && booksToGo > 0 ? (
              <>
                {booksToGo} more to reach your goal of {yearGoal!.target}.{" "}
              </>
            ) : booksToGo === 0 ? (
              <>You&rsquo;ve reached your reading goal for the year. </>
            ) : (
              <>
                <Link
                  href="/profile/goals"
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  Set a reading goal
                </Link>{" "}
                to track the year.{" "}
              </>
            )}
            {session && session.streakDays > 0 ? (
              <>
                You&rsquo;ve read {session.streakDays} day
                {session.streakDays === 1 ? "" : "s"} running.
              </>
            ) : null}
          </p>
        </div>

        {/* Twelve months as a shape, not a chart: no axis, no gridlines, no
            legend, no tooltip. It answers "when did I read?" at a glance and
            leaves the real analysis to /profile/stats. */}
        {readAnything ? (
          <div className="shrink-0">
            <div className="flex items-end gap-1.5" aria-hidden>
              {months.map((m) => (
                <div
                  key={m.month}
                  className="flex w-6 flex-col items-center gap-1.5 sm:w-7"
                >
                  <div
                    className={cn(
                      "w-full rounded-[2px]",
                      m.minutes > 0 ? "bg-primary/70" : "bg-border",
                    )}
                    style={{
                      height:
                        m.minutes > 0
                          ? `${Math.max(4, Math.round((m.minutes / peak) * 56))}px`
                          : "2px",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {m.label.charAt(0)}
                  </span>
                </div>
              ))}
            </div>
            <p className="sr-only">
              {months
                .map((m) => `${m.label}: ${formatDuration(m.minutes)}`)
                .join(", ")}
            </p>
          </div>
        ) : null}
      </div>
    </Band>
  );
}
