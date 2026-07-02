"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  NotebookText,
} from "lucide-react";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { bucket, BUCKET_CLASS, isoLocalDate } from "@/components/ReadingHeatmap";
import { TINTS } from "@/components/StatsView";
import { useCalendarRange, useSessionStats } from "@/lib/queries";
import type { CalendarDay } from "@/lib/api";

const WEEKS = 13; // columns shown per page — aligns with the "Last 13 weeks" stat window
const ROWS = 7; // Mon..Sun
const BUFFER_DAYS = 27 * 7; // fetch 27 weeks once; paginate client-side within it (2 pages)

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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

function formatShortDate(key: string): string {
  const [, m, d] = key.split("-").map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

function formatStreakRange(range: { start: string; end: string }): string {
  return `${formatShortDate(range.start)} – ${formatShortDate(range.end)}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Monday of the week containing d (Monday-first weeks).
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

function StatPill({
  icon,
  value,
  label,
  tint,
  caption,
  featured = false,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tint: keyof typeof TINTS;
  caption?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-w-0 items-center rounded-xl border bg-muted/40",
        featured ? "gap-3.5 px-4 py-5" : "gap-3 px-3.5 py-3",
      ].join(" ")}
    >
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-full",
          featured ? "h-11 w-11" : "h-9 w-9",
          TINTS[tint],
        ].join(" ")}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={[
            "truncate font-semibold leading-tight",
            featured ? "text-2xl" : "text-base",
          ].join(" ")}
        >
          {value}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{label}</p>
        {caption ? (
          <p className="truncate text-[10px] leading-tight text-muted-foreground/80">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}

// One column of the unified footer — icon on the left, stacked text on the
// right, so "Longest streak" / "Total sessions" mirror the "Most reading"
// row pattern instead of a centered label-on-top layout.
function SummaryColumn({
  icon,
  tint,
  label,
  children,
}: {
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TINTS[tint]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  );
}

// Home tab preview widget — deliberately a DIFFERENT UI structure from the
// full /calendar page (components/CalendarView.tsx): a compact featured
// stat sidebar beside a navigable 13-week heatmap preview, over a unified
// summary footer. It reuses only the underlying data (useSessionStats,
// useCalendarRange -> lib/calendarData.ts) so it can never disagree with the
// full page's numbers. Deep history lives behind the "See all" link.
export function HomeReadingCalendarPreviewCard() {
  const [pageOffset, setPageOffset] = React.useState(0); // 0 = newest 13 weeks
  const { data: stats } = useSessionStats();
  // One generous fetch; navigation pages through it client-side (no refetch).
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);

  // Always render once stats has loaded, even with zero sessions — a
  // brand-new library still gets a polished, friendly module.
  if (!stats) return null;

  const hasSessions = stats.sessionCount > 0;
  const byDay = new Map(rangeDays.map((d) => [d.date, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = isoLocalDate(today);

  // Monday-aligned columns so the weekday labels are truthful. The newest
  // page ends at the week containing today; each page back shifts 13 weeks.
  const latestMonday = mondayOf(today);
  const lastColMonday = addDays(latestMonday, -pageOffset * WEEKS * 7);
  const firstColMonday = addDays(lastColMonday, -(WEEKS - 1) * 7);

  const columns: { date: string; data: CalendarDay | undefined; isFuture: boolean }[][] = [];
  for (let c = 0; c < WEEKS; c++) {
    const colMonday = addDays(firstColMonday, c * 7);
    const col = [];
    for (let r = 0; r < ROWS; r++) {
      const cellDate = addDays(colMonday, r);
      const key = isoLocalDate(cellDate);
      col.push({ date: key, data: byDay.get(key), isFuture: cellDate > today });
    }
    columns.push(col);
  }

  // Month label per column — printed only when the month changes.
  let lastMonth = -1;
  const monthLabels = columns.map((col) => {
    const [, m] = col[0].date.split("-").map(Number);
    if (m - 1 !== lastMonth) {
      lastMonth = m - 1;
      return SHORT_MONTHS[m - 1].toUpperCase();
    }
    return null;
  });

  const firstCellDate = columns[0][0].date;
  const lastCellDate = columns[WEEKS - 1][ROWS - 1].date;
  const rangeLabel = (() => {
    const [, fm] = firstCellDate.split("-").map(Number);
    const [ly, lm] = lastCellDate.split("-").map(Number);
    const start = SHORT_MONTHS[fm - 1];
    const end = SHORT_MONTHS[lm - 1];
    return start === end ? `${start} ${ly}` : `${start} – ${end} ${ly}`;
  })();

  const topDay = stats.topDay;
  const canGoBack = pageOffset < 1; // buffer covers 2 pages
  const canGoForward = pageOffset > 0;

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

      {/* Main body — 30/70 stats-to-heatmap split on desktop; stacked on mobile/tablet */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[3fr_7fr] lg:items-stretch lg:gap-5">
        {/* Stat sidebar — 4 stacked cards; Day streak featured (taller) as the
            hero metric. justify-between spreads them to match the heatmap height. */}
        <div className="flex flex-col gap-2 lg:justify-between">
          <StatPill
            icon={<Flame className="h-5 w-5" />}
            value={stats.streakDays}
            label="Day streak"
            tint="amber"
            caption={stats.streakDays > 0 ? "Keep it going!" : "Start today!"}
            featured
          />
          <StatPill
            icon={<BookOpen className="h-4 w-4" />}
            value={stats.daysReadInWindow}
            label="Days read"
            tint="emerald"
            caption="Last 13 weeks"
          />
          <StatPill
            icon={<Clock className="h-4 w-4" />}
            value={formatDuration(stats.minutesInWindow)}
            label="Time read"
            tint="teal"
            caption="Last 13 weeks"
          />
          <StatPill
            icon={<NotebookText className="h-4 w-4" />}
            value={stats.pagesInWindow.toLocaleString()}
            label="Pages read"
            tint="violet"
            caption="Last 13 weeks"
          />
        </div>

        {/* Heatmap panel — header (range + nav), weekday/month labels, grid, legend. */}
        <div className="rounded-xl border bg-muted/20 p-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{rangeLabel}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPageOffset((o) => o + 1)}
                disabled={!canGoBack}
                className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
                aria-label="Earlier weeks"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPageOffset(0)}
                disabled={!canGoForward}
                className="rounded-lg border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPageOffset((o) => Math.max(0, o - 1))}
                disabled={!canGoForward}
                className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
                aria-label="Later weeks"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Grid: weekday-label column + 13 week columns with month labels above */}
          <div className="mt-4 flex gap-[3px]">
            {/* Weekday labels (Monday-first) */}
            <div className="flex flex-col gap-[3px] pr-1">
              <div className="h-3" /> {/* spacer aligning with the month-label row */}
              {WEEKDAY_INITIALS.map((d, i) => (
                <span
                  key={i}
                  className="flex h-[18px] items-center text-[9px] leading-none text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>

            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[9px] font-medium leading-none text-muted-foreground">
                  {monthLabels[ci] ?? ""}
                </span>
                {col.map((cell) => {
                  const isToday = cell.date === todayKey;
                  const minutes = cell.data?.totalMinutes ?? 0;
                  return (
                    <div
                      key={cell.date}
                      title={cell.isFuture ? cell.date : `${cell.date} · ${minutes} min`}
                      className={[
                        "h-[18px] w-[18px] shrink-0 rounded-[5px]",
                        cell.isFuture ? "bg-muted/30" : BUCKET_CLASS[bucket(minutes)],
                        isToday ? "ring-1 ring-primary" : "",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            {LEGEND.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Unified summary footer — one container, three divider-separated columns */}
      <div className="grid grid-cols-1 divide-y divide-border rounded-xl border bg-muted/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {/* Most reading */}
        <div className="p-3.5">
          {hasSessions && topDay ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {topDay.coverCandidates.length > 0 ? (
                  <FallbackCoverImg candidates={topDay.coverCandidates} alt={topDay.bookTitle} />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Most reading</p>
                <p className="line-clamp-1 text-sm font-medium leading-tight">{topDay.bookTitle}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatShortDate(topDay.date)} · {formatDuration(topDay.minutes)}
                  {topDay.pagesRead > 0 ? ` · ${topDay.pagesRead}p` : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-8 shrink-0 items-center justify-center rounded-md border bg-muted">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">Most reading</p>
                <p className="text-xs text-muted-foreground">
                  Start your first reading session to build your reading calendar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Longest streak */}
        <SummaryColumn icon={<Flame className="h-4 w-4" />} tint="amber" label="Longest streak">
          <p className="text-sm font-semibold leading-tight">
            {stats.longestStreakDays} day{stats.longestStreakDays === 1 ? "" : "s"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {stats.longestStreakRange ? formatStreakRange(stats.longestStreakRange) : "—"}
          </p>
        </SummaryColumn>

        {/* Total sessions */}
        <SummaryColumn icon={<NotebookText className="h-4 w-4" />} tint="blue" label="Total sessions">
          <p className="text-sm font-semibold leading-tight">{stats.sessionsInWindow} sessions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Last 13 weeks</p>
        </SummaryColumn>
      </div>
    </div>
  );
}
