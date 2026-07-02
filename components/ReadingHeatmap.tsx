"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/StatsView";
import { CellCover } from "@/components/FallbackCoverImg";
import { useCalendarRange, useSessionStats } from "@/lib/queries";

const COLS = 13; // weeks (plain mode)
const ROWS = 7; // days per week
const DAYS = COLS * ROWS; // 91 days per window (plain mode)

// Cover mode uses a shorter, wider-celled window so covers stay legible —
// 8 weeks reads as a compact "preview," distinct from the full 13-week
// analytics view on /stats and /sessions.
const COVER_COLS = 8;
const COVER_DAYS = COVER_COLS * ROWS; // 56 days

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Minutes-that-day -> intensity bucket (0-4). Thresholds chosen to match
// the legend copy exactly (1-30 / 30-60 / 1-2 hrs / 2+ hrs).
export function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

export const BUCKET_CLASS = [
  "bg-muted",
  "bg-primary/15",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

// Ring width (not opacity/color) scales with intensity when a cover sits
// under the ring — a fixed hue keeps things legible over any cover's own
// colors, where a low-opacity ring would be invisible against light art.
const BUCKET_RING_CLASS = [
  "",
  "ring-1 ring-primary/70",
  "ring-[1.5px] ring-primary/80",
  "ring-2 ring-primary",
  "ring-2 ring-offset-1 ring-primary",
];

const LEGEND = [
  { label: "No reading", cls: "bg-muted" },
  { label: "1–30 mins", cls: "bg-primary/15" },
  { label: "30–60 mins", cls: "bg-primary/40" },
  { label: "1–2 hrs", cls: "bg-primary/70" },
  { label: "2+ hrs", cls: "bg-primary" },
];

export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface RangeDayLite {
  date: string;
  totalMinutes: number;
  primary: { coverCandidates: string[] } | null;
  extraBookCount: number;
}

// GitHub-style contribution grid with month range label, Prev/Next
// navigation, and a legend. Backed by the shared calendar-data builder
// (lib/calendarData.ts) via useCalendarRange, the same source used by the
// full calendar page and its export — so this heatmap always agrees with
// the rest of the app.
//
// `showCovers`/`showTodayButton` are opt-in (default off) so the existing
// plain-dot usage on /stats and /sessions stays pixel-identical; only the
// Home tab's preview card turns them on.
export function ReadingHeatmap({
  offset,
  onOffsetChange,
  showCard = true,
  showCovers = false,
  showTodayButton = false,
}: {
  offset: number;
  onOffsetChange: (next: number) => void;
  showCard?: boolean;
  showCovers?: boolean;
  showTodayButton?: boolean;
}) {
  const cols = showCovers ? COVER_COLS : COLS;
  const totalDays = showCovers ? COVER_DAYS : DAYS;

  const { data: stats } = useSessionStats();
  const { data: rangeDays = [] } = useCalendarRange(offset, totalDays);

  if (!stats) return null;
  // Plain mode (/stats, /sessions) keeps the existing "hidden when empty"
  // precedent. Cover mode (Home tab) always renders — its caller wants a
  // polished empty grid, not a gap in the layout, when there's no data yet.
  if (stats.sessionCount === 0 && !showCovers) return null;

  const byDay = new Map<string, RangeDayLite>(
    rangeDays.map((d) => [
      d.date,
      { date: d.date, totalMinutes: d.totalMinutes, primary: d.primary, extraBookCount: d.extraBookCount },
    ]),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() - offset * totalDays);

  const cells: RangeDayLite[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(windowEnd);
    d.setDate(d.getDate() - i);
    const key = isoLocalDate(d);
    cells.push(
      byDay.get(key) ?? { date: key, totalMinutes: 0, primary: null, extraBookCount: 0 },
    );
  }

  const columns: RangeDayLite[][] = [];
  for (let c = 0; c < cols; c++) {
    columns.push(cells.slice(c * ROWS, c * ROWS + ROWS));
  }

  const rangeLabel = (() => {
    const first = new Date(cells[0].date);
    const last = new Date(cells[cells.length - 1].date);
    const startMonth = SHORT_MONTHS[first.getMonth()];
    const endMonth = SHORT_MONTHS[last.getMonth()];
    const monthPart =
      startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`;
    return first.getFullYear() === last.getFullYear()
      ? `${monthPart} ${last.getFullYear()}`
      : `${first.getFullYear()} – ${last.getFullYear()}`;
  })();

  const todayKey = isoLocalDate(today);

  // Month label per column — print a short abbreviation only when the month
  // changes from the previous column, GitHub-contribution-graph style.
  let lastMonth = -1;
  const monthLabels = columns.map((col) => {
    const firstDate = new Date(col[0].date);
    const month = firstDate.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      return SHORT_MONTHS[month];
    }
    return null;
  });

  const cellSizeClass = showCovers ? "h-8 w-8" : "h-[11px] w-[11px]";

  const body = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOffsetChange(offset + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary"
          aria-label="Earlier weeks"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-sm font-medium">{rangeLabel}</p>
        <div className="flex items-center gap-1">
          {showTodayButton ? (
            <button
              type="button"
              onClick={() => onOffsetChange(0)}
              disabled={offset === 0}
              className="rounded-lg border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Today
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOffsetChange(Math.max(0, offset - 1))}
            disabled={offset === 0}
            className="flex h-7 w-7 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Later weeks"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {showCovers ? (
        <div className="flex gap-[3px] overflow-x-auto">
          {columns.map((week, i) => (
            <div key={i} className="flex flex-col items-center gap-[3px]">
              <span className="h-3 text-[9px] font-medium text-muted-foreground">
                {monthLabels[i] ?? ""}
              </span>
              {week.map((day) => {
                const isToday = day.date === todayKey;
                const candidates = day.primary?.coverCandidates ?? [];
                const hasCover = candidates.length > 0;
                const b = bucket(day.totalMinutes);
                return (
                  <div
                    key={day.date}
                    title={`${day.date} · ${day.totalMinutes} min`}
                    className={[
                      "relative shrink-0 overflow-hidden rounded-md",
                      cellSizeClass,
                      hasCover ? BUCKET_RING_CLASS[b] : BUCKET_CLASS[b],
                      // "Today" uses outline (not ring) so it composes
                      // independently of the intensity ring above instead
                      // of colliding with it visually.
                      isToday ? "outline outline-2 outline-offset-1 outline-foreground" : "",
                    ].join(" ")}
                  >
                    {hasCover ? (
                      <CellCover
                        candidates={candidates}
                        className="absolute inset-0 block overflow-hidden rounded-md"
                      />
                    ) : null}
                    {day.extraBookCount > 0 ? (
                      <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/60 px-0.5 text-[7px] font-semibold leading-[10px] text-white">
                        +{day.extraBookCount}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-[3px] overflow-x-auto">
          {columns.map((week, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date} · ${day.totalMinutes} min`}
                  className={[
                    cellSizeClass,
                    "shrink-0 rounded-sm",
                    BUCKET_CLASS[bucket(day.totalMinutes)],
                    day.date === todayKey ? "ring-1 ring-primary" : "",
                  ].join(" ")}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-sm ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );

  if (!showCard) return body;
  return (
    <Card title="Reading calendar" subtitle="Last 13 weeks">
      {body}
    </Card>
  );
}
