"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock, Flame, NotebookText } from "lucide-react";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { bucket, BUCKET_CLASS, isoLocalDate } from "@/components/ReadingHeatmap";
import { useCalendarRange, useSessionStats } from "@/lib/queries";
import type { CalendarDay } from "@/lib/api";

const GRID_WEEKS = 5;
const GRID_ROWS = 7;
const GRID_DAYS = GRID_WEEKS * GRID_ROWS; // 35 days — "last 5 weeks"

const LEGEND = [
  { label: "None", cls: "bg-muted" },
  { label: "1–30m", cls: "bg-primary/15" },
  { label: "30–60m", cls: "bg-primary/40" },
  { label: "1–2h", cls: "bg-primary/70" },
  { label: "2h+", cls: "bg-primary" },
];

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatShortDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

function formatStreakRange(range: { start: string; end: string }): string {
  return `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`;
}

// Normalized shape the summary strip's "most reading day" block renders,
// whether it's showing the default 90-day top day (from useSessionStats) or
// a day tapped in the mini grid (from the already-fetched 5-week range —
// no extra request needed).
interface SummaryDayInfo {
  date: string;
  bookTitle: string;
  coverCandidates: string[];
  minutes: number;
  pagesRead: number;
}

function summaryFromRangeDay(day: CalendarDay): SummaryDayInfo | null {
  if (!day.primary) return null;
  return {
    date: day.date,
    bookTitle: day.primary.bookTitle,
    coverCandidates: day.primary.coverCandidates,
    minutes: day.totalMinutes,
    pagesRead: day.totalPages,
  };
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card px-3 py-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{value}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// Home tab preview widget — deliberately a DIFFERENT UI structure from the
// full /calendar page (components/CalendarView.tsx): no navigation, no
// covers embedded in grid cells, a fixed 5-week window. It reuses only the
// underlying data (useSessionStats, useCalendarRange -> lib/calendarData.ts)
// so it can never disagree with the full page's numbers, while staying a
// compact, tap-to-preview dashboard card rather than a shrunk calendar page.
export function HomeReadingCalendarPreviewCard() {
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const { data: stats } = useSessionStats();
  const { data: rangeDays = [] } = useCalendarRange(0, GRID_DAYS);

  // Always render once stats has loaded, even with zero sessions — a
  // brand-new library still gets a polished, friendly module.
  if (!stats) return null;

  const hasSessions = stats.sessionCount > 0;
  const byDay = new Map(rangeDays.map((d) => [d.date, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = isoLocalDate(today);

  const cells: CalendarDay[] = [];
  for (let i = GRID_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoLocalDate(d);
    cells.push(
      byDay.get(key) ?? {
        date: key,
        totalMinutes: 0,
        totalPages: 0,
        sessions: [],
        primary: null,
        extraBookCount: 0,
      },
    );
  }
  const columns: CalendarDay[][] = [];
  for (let c = 0; c < GRID_WEEKS; c++) {
    columns.push(cells.slice(c * GRID_ROWS, c * GRID_ROWS + GRID_ROWS));
  }

  const selectedDay = selectedDate ? byDay.get(selectedDate) ?? null : null;
  const selectedSummary = selectedDay ? summaryFromRangeDay(selectedDay) : null;
  const defaultSummary: SummaryDayInfo | null = stats.topDay
    ? {
        date: stats.topDay.date,
        bookTitle: stats.topDay.bookTitle,
        coverCandidates: stats.topDay.coverCandidates,
        minutes: stats.topDay.minutes,
        pagesRead: stats.topDay.pagesRead,
      }
    : null;
  const isShowingSelection = selectedSummary !== null;
  const summary = selectedSummary ?? defaultSummary;

  function toggleDay(date: string, minutes: number) {
    if (minutes <= 0) return; // empty days aren't tappable
    setSelectedDate((prev) => (prev === date ? null : date));
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
      {/* Header */}
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

      {/* Stat pill row — single row by default, 2x2 only on the narrowest widths */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill
          icon={<Flame className="h-3.5 w-3.5" />}
          value={stats.streakDays}
          label="Day streak"
        />
        <StatPill
          icon={<BookOpen className="h-3.5 w-3.5" />}
          value={stats.daysReadInWindow}
          label="Days read"
        />
        <StatPill
          icon={<Clock className="h-3.5 w-3.5" />}
          value={formatDuration(stats.minutesInWindow)}
          label="Time read"
        />
        <StatPill
          icon={<NotebookText className="h-3.5 w-3.5" />}
          value={stats.pagesInWindow.toLocaleString()}
          label="Pages read"
        />
      </div>

      {/* Mini calendar preview — fixed 5-week window, no nav, no covers in cells */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Last 5 weeks</p>
        <div className="flex justify-center gap-[3px]">
          {columns.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const isToday = day.date === todayKey;
                const isSelected = day.date === selectedDate;
                const tappable = day.totalMinutes > 0;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => toggleDay(day.date, day.totalMinutes)}
                    disabled={!tappable}
                    title={`${day.date} · ${day.totalMinutes} min`}
                    className={[
                      "h-[22px] w-[22px] shrink-0 rounded-md transition-transform",
                      BUCKET_CLASS[bucket(day.totalMinutes)],
                      isToday ? "ring-1 ring-primary" : "",
                      isSelected ? "ring-2 ring-primary scale-110" : "",
                      tappable ? "cursor-pointer hover:scale-110" : "cursor-default",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/40 p-3">
          {hasSessions && summary ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-7 shrink-0 overflow-hidden rounded-md border bg-muted">
                <FallbackCoverImg candidates={summary.coverCandidates} alt={summary.bookTitle} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {isShowingSelection ? "Selected · " : "Most reading on "}
                  {formatShortDate(summary.date)}
                </p>
                <p className="line-clamp-1 text-sm font-medium">{summary.bookTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(summary.minutes)}
                  {summary.pagesRead > 0 ? ` · ${summary.pagesRead} pages` : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start your first reading session to build your reading calendar.
            </p>
          )}
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
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

        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Total sessions</p>
          <p className="text-sm font-medium">{stats.sessionsInWindow} sessions</p>
          <p className="text-xs text-muted-foreground">Last 13 weeks</p>
        </div>
      </div>
    </div>
  );
}
