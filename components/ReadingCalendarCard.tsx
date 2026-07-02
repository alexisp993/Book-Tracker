"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock, Flame, NotebookText } from "lucide-react";
import { Stat } from "@/components/StatsView";
import { ReadingHeatmap } from "@/components/ReadingHeatmap";
import { useSessionStats } from "@/lib/queries";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatShortDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

function formatStreakRange(range: { start: string; end: string }): string {
  return `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`;
}

// Home tab preview card — a compact, always-visible dashboard module: its
// own header ("Reading Calendar" + "See all"), a stat column (2x2 on mobile,
// stacked on desktop), the shared cover-capable heatmap
// (components/ReadingHeatmap.tsx, showCovers/showTodayButton on), and a
// "most reading on X" summary strip. Everything is powered by real data —
// useSessionStats() (window aggregates, streak, topDay) and
// useCalendarRange() inside ReadingHeatmap — both backed by the same
// normalized calendar-data builder the full calendar page and its export
// use, so nothing here is a separate/fake calendar implementation.
export function ReadingCalendarCard() {
  const [offset, setOffset] = React.useState(0);
  const { data: stats } = useSessionStats();

  // Unlike most Home sections, this card always renders (even with zero
  // sessions) so a brand-new library still sees a polished, friendly module
  // rather than a gap in the layout.
  if (!stats) return null;

  const hasSessions = stats.sessionCount > 0;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      {/* Header — owned by the card itself, not the outer Home section */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
          <CalendarDays className="h-4 w-4 text-primary" />
          Reading Calendar
        </h2>
        <Link
          href="/calendar"
          className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
        {/* Stat column — 2x2 grid on mobile/tablet, stacked column on desktop */}
        <div className="grid grid-cols-2 gap-2.5 lg:w-40 lg:shrink-0 lg:grid-cols-1">
          <Stat
            icon={<Flame className="h-4 w-4" />}
            label="Day streak"
            tint="amber"
            value={stats.streakDays}
            caption={stats.streakDays > 0 ? "Keep it going!" : "Start today!"}
          />
          <Stat
            icon={<BookOpen className="h-4 w-4" />}
            label="Days read"
            tint="emerald"
            value={stats.daysReadInWindow}
            caption="Last 13 weeks"
          />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="Time read"
            tint="teal"
            value={formatDuration(stats.minutesInWindow)}
            caption="Last 13 weeks"
          />
          <Stat
            icon={<NotebookText className="h-4 w-4" />}
            label="Pages read"
            tint="violet"
            value={stats.pagesInWindow.toLocaleString()}
            caption="Last 13 weeks"
          />
        </div>

        {/* Calendar preview — same shared data/heatmap as /stats and /sessions,
            just with covers + a Today button turned on. */}
        <div className="min-w-0 flex-1">
          <ReadingHeatmap
            offset={offset}
            onOffsetChange={setOffset}
            showCard={false}
            showCovers
            showTodayButton
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
        {hasSessions && stats.topDay ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-7 shrink-0 overflow-hidden rounded-md border bg-muted">
              {stats.topDay.coverCandidates[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stats.topDay.coverCandidates[0]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                Most reading on {formatShortDate(stats.topDay.date)}
              </p>
              <p className="line-clamp-1 text-sm font-medium">{stats.topDay.bookTitle}</p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(stats.topDay.minutes)}
                {stats.topDay.pagesRead > 0 ? ` · ${stats.topDay.pagesRead} pages` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No reading sessions yet</p>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Longest streak</p>
          <p className="text-sm font-medium">
            {stats.longestStreakDays} day{stats.longestStreakDays === 1 ? "" : "s"}
          </p>
          {stats.longestStreakRange ? (
            <p className="text-xs text-muted-foreground">
              {formatStreakRange(stats.longestStreakRange)}
            </p>
          ) : null}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Total sessions</p>
          <p className="text-sm font-medium">{stats.sessionsInWindow} sessions</p>
          <p className="text-xs text-muted-foreground">Last 13 weeks</p>
        </div>
      </div>
    </div>
  );
}
