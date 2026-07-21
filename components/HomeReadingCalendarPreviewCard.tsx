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
  Lightbulb,
  NotebookText,
} from "lucide-react";
import { TINTS } from "@/lib/constants";
import { useCalendarRange, useSessionStats, useStats } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";
import {
  addDays,
  bucket,
  BUCKET_CLASS,
  BUCKET_LEGEND,
  isoLocalDate,
  LABELED_WEEKDAY_ROWS,
  SHORT_MONTHS,
  sundayOf,
  WEEKDAY_INITIALS,
  WEEKDAY_LABELS,
} from "@/lib/calendarViewModel";
import type { CalendarDay } from "@/lib/api";

const WEEKS = 53; // columns shown per page — a full rolling year (GitHub-style)
const ROWS = 7; // Sun..Sat
const BUFFER_DAYS = (WEEKS * 2 + 2) * 7; // ~2 years, so the 2-page nav (this year / last year) works

// Soft full-card pastel backgrounds, one per tint used on this card's stat
// row — same color families as TINTS's icon-badge classes, just a lower
// opacity so the whole card reads as a tinted panel, not just the icon.
const CARD_TINTS: Record<"amber" | "emerald" | "teal" | "violet", string> = {
  amber: "bg-amber-500/10",
  emerald: "bg-emerald-500/10",
  teal: "bg-teal-500/10",
  violet: "bg-violet-500/10",
};

// All four metric cards share one uniform style: a pastel-tinted card,
// centered icon badge, bold value, and a single muted detail line
// ("label • caption"), so every card in the row has identical width,
// padding, and text shape — only the tint color differs.
function StatPill({
  icon,
  value,
  label,
  tint,
  caption,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  tint: keyof typeof CARD_TINTS;
  caption?: string;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-xl px-4 py-3.5 ${CARD_TINTS[tint]}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ${TINTS[tint]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold leading-tight">{value}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {label}
          {caption ? ` • ${caption}` : ""}
        </p>
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
  const [pageOffset, setPageOffset] = React.useState(0); // 0 = newest 53 weeks
  const { data: stats } = useSessionStats();
  const { data: libStats } = useStats(); // for the "Books read" metric
  // One generous fetch; navigation pages through it client-side (no refetch).
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);

  // Default the heatmap's horizontal scroll to the far right (newest weeks)
  // on load and after paging, so the user's most recent reading is what
  // greets them. `stats` is a dep because the grid only mounts once stats
  // has loaded — the ref is null before that.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [pageOffset, stats]);

  // Always render once stats has loaded, even with zero sessions — a
  // brand-new library still gets a polished, friendly module.
  if (!stats) return null;

  const byDay = new Map(rangeDays.map((d) => [d.date, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = isoLocalDate(today);

  // Sunday-aligned columns so the weekday labels are truthful. The newest
  // page ends at the week containing today; each page back shifts 53 weeks.
  const latestSunday = sundayOf(today);
  const lastColMonday = addDays(latestSunday, -pageOffset * WEEKS * 7);
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

  // Month label per column — label the FIRST column that contains any day of a
  // not-yet-seen month (scanning all 7 cells, not just the Monday), so a month
  // whose 1st falls mid-week — including the current/rightmost month showing
  // only its last few days — still gets exactly one label, aligned to its
  // first visible week column.
  // Keyed by "year-month" (not just month index) so a rolling year that
  // crosses a year boundary labels the boundary month at BOTH ends — e.g.
  // Jul 2025 and the current Jul 2026 both get a label.
  const seenMonths = new Set<string>();
  const monthLabels = columns.map((col) => {
    for (const cell of col) {
      const [y, mm] = cell.date.split("-");
      const key = `${y}-${mm}`;
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        return SHORT_MONTHS[Number(mm) - 1].toUpperCase();
      }
    }
    return null;
  });

  const firstCellDate = columns[0][0].date;
  const lastCellDate = columns[WEEKS - 1][ROWS - 1].date;
  const rangeLabel = (() => {
    const [fy, fm] = firstCellDate.split("-").map(Number);
    const [ly, lm] = lastCellDate.split("-").map(Number);
    // Show the start year only when it differs from the end year, so a
    // rolling year reads "Jul 2025 – Jul 2026" and a calendar year "Jan – Dec 2026".
    const startStr = fy === ly ? SHORT_MONTHS[fm - 1] : `${SHORT_MONTHS[fm - 1]} ${fy}`;
    return `${startStr} – ${SHORT_MONTHS[lm - 1]} ${ly}`;
  })();

  const canGoBack = pageOffset < 1; // buffer covers 2 pages
  const canGoForward = pageOffset > 0;

  return (
    <div className="space-y-4">
      {/* Header — bare, no card background */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Reading Calendar
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track your reading consistency over time
          </p>
        </div>
        <Link
          href="/calendar"
          className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Standalone heatmap card — header (range + nav), weekday/month labels,
          grid, legend. */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{rangeLabel}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPageOffset((o) => o + 1)}
                disabled={!canGoBack}
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
                aria-label="Earlier weeks"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPageOffset(0)}
                disabled={!canGoForward}
                className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPageOffset((o) => Math.max(0, o - 1))}
                disabled={!canGoForward}
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
                aria-label="Later weeks"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Grid: a FIXED weekday-label column beside a horizontally
              scrollable region holding the month labels + 53 week columns of
              12px squares. Only the grid scrolls — the panel header above and
              legend below stay put — and the native scrollbar is hidden (same
              utility combo as HomeView's BookScrollRow) so it reads as a clean
              swipeable timeline. An effect scrolls it to the far right (newest
              weeks) on load. */}
          <div className="mt-4 flex gap-[3px]">
            {/* Weekday axis (Sunday-first) — pinned outside the scroll region.
                Only Mon/Wed/Fri are labelled, per GitHub, so the type can stay
                at a legible 10px rather than being crammed to 8px. */}
            <div className="flex shrink-0 flex-col gap-[3px] pr-1">
              <div className="h-3" aria-hidden /> {/* aligns with the month-label row */}
              {WEEKDAY_INITIALS.map((d, i) => (
                <span
                  key={i}
                  className="flex h-3 items-center text-[10px] leading-none text-muted-foreground"
                  aria-hidden
                >
                  {LABELED_WEEKDAY_ROWS.includes(i) ? d : ""}
                </span>
              ))}
            </div>

            <div
              ref={scrollRef}
              className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex w-max gap-[3px]">
                {columns.map((col, ci) => (
                  <div key={ci} className="flex w-3 shrink-0 flex-col gap-[3px]">
                    <span className="h-3 w-3 overflow-visible whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground">
                      {monthLabels[ci] ?? ""}
                    </span>
                    {col.map((cell) => {
                      const isToday = cell.date === todayKey;
                      const minutes = cell.data?.totalMinutes ?? 0;
                      const weekday = WEEKDAY_LABELS[new Date(cell.date).getDay()];
                      return (
                        <div
                          key={cell.date}
                          title={
                            cell.isFuture
                              ? cell.date
                              : `${cell.date} · ${formatDuration(minutes)}`
                          }
                          // Colour alone can't convey the value, so each cell
                          // carries a readable label for assistive tech.
                          aria-label={
                            cell.isFuture
                              ? undefined
                              : `${weekday} ${cell.date}: ${
                                  minutes > 0 ? formatDuration(minutes) : "no reading"
                                }`
                          }
                          className={[
                            "h-3 w-3 rounded-[3px]",
                            cell.isFuture ? "bg-muted/30" : BUCKET_CLASS[bucket(minutes)],
                            isToday ? "ring-1 ring-primary" : "",
                          ].join(" ")}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
            {BUCKET_LEGEND.map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
      </div>

      {/* Standalone reading-summary card — stat row + a streak tip banner */}
      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            icon={<Flame className="h-4 w-4" />}
            value={stats.streakDays}
            label="Day streak"
            tint="amber"
            caption={stats.streakDays > 0 ? "Keep it going!" : "Start today!"}
          />
          <StatPill
            icon={<BookOpen className="h-4 w-4" />}
            value={libStats?.read ?? 0}
            label="Books read"
            tint="emerald"
            caption="All time"
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
            value={stats.sessionsInWindow}
            label="Sessions"
            tint="violet"
            caption="Last 13 weeks"
          />
        </div>

        {/* Tip banner — title reflects the real streak status, not fabricated */}
        <div className="flex flex-col items-start gap-3 rounded-xl bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-amber-600 dark:text-amber-300">
              <Lightbulb className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {stats.streakDays > 0
                  ? "Keep your reading streak alive!"
                  : "Start your reading streak today!"}
              </p>
              <p className="text-xs text-muted-foreground">
                Read for at least a few minutes each day to build a consistent habit.
              </p>
            </div>
          </div>
          <Link
            href="/sessions"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add Reading
          </Link>
        </div>
      </div>
    </div>
  );
}
