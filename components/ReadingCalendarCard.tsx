"use client";

import * as React from "react";
import { BookOpen, Clock, Flame, NotebookText } from "lucide-react";
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

// Home tab preview card — stat tiles + the shared 13-week heatmap
// (components/ReadingHeatmap.tsx) + a "most reading on X" footer. Everything
// here is powered by real data: useSessionStats() (window aggregates,
// streak, topDay) and useCalendarRange() inside ReadingHeatmap — both backed
// by the same normalized calendar-data builder the full calendar/export use.
export function ReadingCalendarCard() {
  const [offset, setOffset] = React.useState(0);
  const { data: stats } = useSessionStats();

  if (!stats || stats.sessionCount === 0) return null;

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-4 sm:p-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <ReadingHeatmap offset={offset} onOffsetChange={setOffset} showCard={false} />

      {/* Footer stats */}
      <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
        {stats.topDay ? (
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
        ) : null}

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
