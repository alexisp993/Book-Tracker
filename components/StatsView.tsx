"use client";

import type * as React from "react";
import NumberFlow from "@number-flow/react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BookOpen } from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";
import { useSessionStats, useStats } from "@/lib/queries";
import { STATUS_DOT } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { ReadingHeatmap } from "@/components/ReadingHeatmap";
import { Loading } from "@/components/ui/loading";
import { Band } from "@/components/ui/section";
import { BarRow } from "@/components/ui/bar";
import { PageHeader } from "@/components/ui/page-header";

// Statistics, told as a document rather than a dashboard.
//
// What this replaces, and why:
//
// - A four-tab segmented control. Tabs hid three quarters of a reader's year
//   behind a click and implied four separate analyses. There is only one
//   subject here — the reading — so it is one scrolling page.
// - A gradient hero card, six tinted KPI tiles, and boxed chart cards. The
//   brief on this project is explicit about not putting everything in boxes,
//   and a statistics screen is where that habit is strongest.
// - Two sparklines drawn in hard-coded emerald and violet — colours in no
//   theme token, on an account whose series had a single data point, so
//   recharts rendered a "trend" through n=1. Both are deleted rather than
//   restyled: a trend line needs a trend.
// - A trophy chip on the longest streak. Celebrating a one-day streak with a
//   trophy and a self-referential date range reads as mockery; it is a
//   sentence now.
//
// The voice is the one components/home/YearInReading.tsx already established:
// numbers set as prose, zero values dropped rather than rendered as "0 books",
// and nothing derived that the reader did not ask for.
export function StatsView() {
  const { data: stats, isLoading: loading } = useStats();
  const { data: sessionStats } = useSessionStats();

  // The header renders in every state — loading and empty included — so the
  // screen never appears untitled while data resolves.
  if (loading || !stats || stats.total === 0) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader title="Statistics" />
        {loading ? (
          <Loading label="Loading your stats…" />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No stats yet"
            description="Add and finish some books to see your reading insights."
          />
        )}
      </div>
    );
  }

  const maxStatus = Math.max(1, ...stats.byStatus.map((s) => s.count));
  const maxRating = Math.max(1, ...stats.ratingDistribution.map((r) => r.count));
  const maxGenre = Math.max(1, ...stats.genreBreakdown.map((g) => g.count));
  const maxAuthor = Math.max(1, ...stats.topAuthors.map((a) => a.count));

  const totalMinutesThisYear = stats.minutesPerMonth.reduce((s, m) => s + m.minutes, 0);
  const readAnyTime = totalMinutesThisYear > 0;
  const finishedAnything = stats.booksPerMonth.some((m) => m.count > 0);
  const year = new Date().getFullYear();

  // Prose, so the units carry the meaning instead of a label under a number.
  // Anything at zero is omitted rather than stated.
  const yearParts: string[] = [];
  if (stats.booksThisYear > 0) {
    yearParts.push(
      `${stats.booksThisYear} book${stats.booksThisYear === 1 ? "" : "s"}`,
    );
  }
  if (stats.pagesThisYear > 0) {
    yearParts.push(`${stats.pagesThisYear.toLocaleString()} pages`);
  }
  if (stats.minutesThisYear > 0) yearParts.push(formatDuration(stats.minutesThisYear));

  return (
    // Capped: this is a document to read down, and a full-shell width stretched
    // the bar rows into a report.
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader title="Statistics" subtitle="Your reading year, in full" />

      {/* The opening statement. One number at display scale, in the serif,
          with the rest as a sentence under it — the same shape Home uses, so
          the two screens read as one product rather than a page and its
          report. */}
      <div className="pb-2">
        <p className="font-display text-3xl leading-snug text-balance sm:text-4xl">
          {yearParts.length > 0 ? (
            yearParts.map((p, i) => (
              <span key={p}>
                {i > 0 ? <span className="text-muted-foreground"> · </span> : null}
                {p}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">
              Your year is still a blank page.
            </span>
          )}
        </p>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          in {year}, out of {stats.total} book{stats.total === 1 ? "" : "s"} on
          your shelves.
          {sessionStats && sessionStats.streakDays > 0 ? (
            <>
              {" "}
              You&rsquo;ve read {sessionStats.streakDays} day
              {sessionStats.streakDays === 1 ? "" : "s"} running.
            </>
          ) : null}
        </p>
      </div>

      {readAnyTime ? (
        <Band label="Time read, month by month">
          <MonthlyBarChart
            data={stats.minutesPerMonth.map((m) => ({
              key: m.month,
              label: m.label,
              value: m.minutes,
            }))}
            formatValue={formatDuration}
          />
        </Band>
      ) : null}

      {finishedAnything ? (
        <Band label="Books finished, last 12 months">
          <MonthlyBarChart
            data={stats.booksPerMonth.map((m) => ({
              key: m.month,
              label: m.label,
              value: m.count,
            }))}
            formatValue={(v) => `${v} book${v === 1 ? "" : "s"}`}
          />
        </Band>
      ) : null}

      <Band label="All-time totals">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          <Figure label="Total" value={<NumberFlow value={stats.total} />} />
          <Figure label="Read" value={<NumberFlow value={stats.read} />} />
          <Figure label="Reading" value={<NumberFlow value={stats.reading} />} />
          <Figure label="Pages read" value={<NumberFlow value={stats.pagesRead} />} />
          <Figure label="Favorites" value={<NumberFlow value={stats.favorites} />} />
          <Figure
            label="Avg rating"
            value={
              stats.avgRating ? (
                <NumberFlow
                  value={stats.avgRating}
                  format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                />
              ) : (
                "—"
              )
            }
          />
        </dl>
      </Band>

      <Band label="By status">
        <div className="max-w-2xl space-y-2.5">
          {stats.byStatus.map((s) => (
            <BarRow
              key={s.status}
              label={s.label}
              value={s.count}
              max={maxStatus}
              fillClass={STATUS_DOT[s.status as keyof typeof STATUS_DOT]}
            />
          ))}
        </div>
      </Band>

      {stats.ratedCount > 0 ? (
        <Band label={`Ratings · ${stats.ratedCount} rated`}>
          <div className="max-w-2xl space-y-2.5">
            {[...stats.ratingDistribution].reverse().map((r) => (
              <BarRow
                key={r.rating}
                label={`${r.rating} star${r.rating === 1 ? "" : "s"}`}
                labelClassName="w-16"
                value={r.count}
                max={maxRating}
                // One accent, at the same weight as every other bar on the
                // page. The amber fill and its inline star glyph were the only
                // place this screen spent a second hue.
                fillClass="bg-primary/70"
              />
            ))}
          </div>
        </Band>
      ) : null}

      {stats.genreBreakdown.length > 0 ? (
        <Band label="Favorite genres">
          <div className="max-w-2xl space-y-2.5">
            {stats.genreBreakdown.map((g) => (
              <BarRow
                key={g.name}
                label={g.name}
                value={g.count}
                max={maxGenre}
                fillClass="bg-primary/70"
              />
            ))}
          </div>
        </Band>
      ) : null}

      {stats.topAuthors.length > 0 ? (
        <Band label="Most-read authors">
          {/* Bars rather than a numbered list: the ranking is the shape, so
              the 1/2/3 column was restating what the lengths already say. */}
          <div className="max-w-2xl space-y-2.5">
            {stats.topAuthors.map((a) => (
              <BarRow
                key={a.name}
                label={a.name}
                // Wider than the default w-28: author names are the longest
                // labels on the page and were truncating mid-surname.
                labelClassName="w-40"
                value={a.count}
                max={maxAuthor}
                fillClass="bg-primary/70"
              />
            ))}
          </div>
        </Band>
      ) : null}

      {sessionStats && sessionStats.sessionCount > 0 ? (
        <Band label={`Sessions · ${sessionStats.sessionCount} logged`}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            <Figure
              label="Lifetime hours"
              value={(sessionStats.totalMinutes / 60).toFixed(1)}
            />
            <Figure
              label="Avg pace"
              value={
                sessionStats.avgPagesPerHour
                  ? `${sessionStats.avgPagesPerHour} pg/hr`
                  : "—"
              }
            />
            <Figure label="This week" value={`${sessionStats.hoursThisWeek}h`} />
            <Figure label="This month" value={`${sessionStats.hoursThisMonth}h`} />
          </dl>

          {/* The streak as a sentence. It used to be a card with a trophy in an
              amber puck, which made a one-day run look like an award. */}
          {sessionStats.longestStreakDays > 0 ? (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Your longest run is {sessionStats.longestStreakDays} day
              {sessionStats.longestStreakDays === 1 ? "" : "s"}
              {sessionStats.longestStreakRange ? (
                <>
                  , {formatDate(sessionStats.longestStreakRange.start)}
                  {sessionStats.longestStreakRange.end !==
                  sessionStats.longestStreakRange.start ? (
                    <> to {formatDate(sessionStats.longestStreakRange.end)}</>
                  ) : null}
                </>
              ) : null}
              .
            </p>
          ) : null}
        </Band>
      ) : null}

      <Band label="Reading activity">
        <ReadingHeatmap showCard={false} />
      </Band>
    </div>
  );
}

// Shared month-bucket bar chart (recharts). `activeBar` lets recharts swap the
// fill on hover/tap itself, so there's no manual focus-index state to keep in
// sync — the library owns the interaction, we only style it.
function MonthlyBarChart({
  data,
  formatValue,
}: {
  data: { key: string; label: string; value: number }[];
  formatValue: (v: number) => string;
}) {
  return (
    <div className="-ml-2 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.6)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md">
                  {payload[0].payload.label} / {formatValue(payload[0].value as number)}
                </div>
              ) : null
            }
          />
          <Bar
            dataKey="value"
            fill="hsl(var(--primary) / 0.4)"
            activeBar={{ fill: "hsl(var(--primary))" }}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// A number and its name, with nothing around them.
function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l border-border/60 pl-3">
      <dt className="text-caption-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
