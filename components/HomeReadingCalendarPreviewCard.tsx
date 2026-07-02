"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock, Flame, NotebookText } from "lucide-react";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { bucket, BUCKET_CLASS, isoLocalDate } from "@/components/ReadingHeatmap";
import { TINTS } from "@/components/StatsView";
import { useCalendarRange, useSessionStats } from "@/lib/queries";
import type { CalendarDay } from "@/lib/api";

const GRID_WEEKS = 12;
const GRID_ROWS = 7;
const GRID_DAYS = GRID_WEEKS * GRID_ROWS; // 84 days — "last 12 weeks"

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

function StatPill({
  icon,
  value,
  label,
  tint,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tint: keyof typeof TINTS;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border bg-muted/40 px-3 py-2.5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TINTS[tint]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold leading-tight">{value}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// Home tab preview widget — deliberately a DIFFERENT UI structure from the
// full /calendar page (components/CalendarView.tsx): a fixed 2x2 stat grid
// beside a compact, non-interactive 12-week heatmap preview, with a
// navigation-only interaction model (the whole heatmap links to /calendar,
// same as "See all") rather than an in-place drill-down. It reuses only the
// underlying data (useSessionStats, useCalendarRange -> lib/calendarData.ts)
// so it can never disagree with the full page's numbers.
export function HomeReadingCalendarPreviewCard() {
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

  const topDay = stats.topDay;

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

      {/* Main body — stats left, heatmap preview right on desktop; stacked on mobile/tablet */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {/* Stat chips — always a compact 2x2 grid */}
        <div className="grid grid-cols-2 gap-2 lg:w-[220px] lg:shrink-0">
          <StatPill
            icon={<Flame className="h-4 w-4" />}
            value={stats.streakDays}
            label="Day streak"
            tint="amber"
          />
          <StatPill
            icon={<BookOpen className="h-4 w-4" />}
            value={stats.daysReadInWindow}
            label="Days read"
            tint="emerald"
          />
          <StatPill
            icon={<Clock className="h-4 w-4" />}
            value={formatDuration(stats.minutesInWindow)}
            label="Time read"
            tint="teal"
          />
          <StatPill
            icon={<NotebookText className="h-4 w-4" />}
            value={stats.pagesInWindow.toLocaleString()}
            label="Pages read"
            tint="violet"
          />
        </div>

        {/* Heatmap preview — a pure navigation surface, not interactive per-cell;
            the whole block links through to the full calendar page. */}
        <Link href="/calendar" className="block flex-1 space-y-2 transition-opacity hover:opacity-80">
          <p className="text-xs font-medium text-muted-foreground">Last 12 weeks</p>
          <div className="flex flex-wrap gap-[3px]">
            {columns.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.map((day) => {
                  const isToday = day.date === todayKey;
                  return (
                    <div
                      key={day.date}
                      title={`${day.date} · ${day.totalMinutes} min`}
                      className={[
                        "h-[18px] w-[18px] shrink-0 rounded-[4px]",
                        BUCKET_CLASS[bucket(day.totalMinutes)],
                        isToday ? "ring-1 ring-primary" : "",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            {LEGEND.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/40 p-3">
          {hasSessions && topDay ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {topDay.coverCandidates.length > 0 ? (
                  <FallbackCoverImg
                    candidates={topDay.coverCandidates}
                    alt={topDay.bookTitle}
                  />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  Most reading on {formatShortDate(topDay.date)}
                </p>
                <p className="line-clamp-1 text-sm font-medium">{topDay.bookTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDuration(topDay.minutes)}
                  {topDay.pagesRead > 0 ? ` · ${topDay.pagesRead} pages` : ""}
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
