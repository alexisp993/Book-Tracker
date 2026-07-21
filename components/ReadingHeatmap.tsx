"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useCalendarRange } from "@/lib/queries";
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

const COLS = 13; // weeks per page
const ROWS = 7; // Sun..Sat
const PAGES = 4; // ~1 year of history reachable via Prev
const BUFFER_DAYS = (COLS * PAGES + 2) * 7; // fetched once; paging is client-side

// GitHub-style contribution grid: Sunday-first week-aligned columns, sparse
// weekday labels (Mon/Wed/Fri), a month label above each month's first
// column, Prev/Today/Next paging, and the shared intensity legend.
//
// Columns are real Sun-Sat weeks, so a cell's ROW is its weekday — that's what
// makes the vertical axis (and its labels) mean anything. Backed by the shared
// calendar-data builder (lib/calendarData.ts) and the shared intensity scale
// (lib/calendarViewModel.ts), so it can never disagree with /calendar or the
// Home preview card. Used by /sessions and /profile/stats.
export function ReadingHeatmap({
  offset,
  onOffsetChange,
  showCard = true,
}: {
  offset: number;
  onOffsetChange: (next: number) => void;
  showCard?: boolean;
}) {
  // One generous fetch; Prev/Next page through it client-side with no refetch.
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);

  const byDay = new Map(rangeDays.map((d) => [d.date, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = isoLocalDate(today);

  const lastColSunday = addDays(sundayOf(today), -offset * COLS * 7);
  const firstColSunday = addDays(lastColSunday, -(COLS - 1) * 7);

  const columns: { date: string; minutes: number; isFuture: boolean }[][] = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) {
      const cellDate = addDays(firstColSunday, c * 7 + r);
      const key = isoLocalDate(cellDate);
      col.push({
        date: key,
        minutes: byDay.get(key)?.totalMinutes ?? 0,
        isFuture: cellDate > today,
      });
    }
    columns.push(col);
  }

  // One label above the first column containing a day of a not-yet-seen
  // month. Keyed by "YYYY-MM" so a window spanning a year boundary labels
  // both occurrences of the same month name.
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

  const firstCell = columns[0][0].date;
  const lastCell = columns[COLS - 1][ROWS - 1].date;
  const rangeLabel = (() => {
    const [fy, fm] = firstCell.split("-").map(Number);
    const [ly, lm] = lastCell.split("-").map(Number);
    const start = fy === ly ? SHORT_MONTHS[fm - 1] : `${SHORT_MONTHS[fm - 1]} ${fy}`;
    return `${start} – ${SHORT_MONTHS[lm - 1]} ${ly}`;
  })();

  const canGoBack = offset < PAGES - 1;
  const canGoForward = offset > 0;

  const body = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{rangeLabel}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOffsetChange(offset + 1)}
            disabled={!canGoBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Earlier weeks"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOffsetChange(0)}
            disabled={!canGoForward}
            className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onOffsetChange(Math.max(0, offset - 1))}
            disabled={!canGoForward}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
            aria-label="Later weeks"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-[3px] overflow-x-auto">
        {/* Weekday axis — only Mon/Wed/Fri are labelled (GitHub's convention),
            which keeps the type at a legible 10px instead of cramming all
            seven. Row heights mirror the cells so the axis stays aligned. */}
        <div className="flex shrink-0 flex-col gap-[3px] pr-1">
          <div className="h-3" aria-hidden /> {/* aligns with the month-label row */}
          {WEEKDAY_INITIALS.map((d, i) => (
            <span
              key={i}
              className="flex h-[11px] items-center text-[10px] leading-none text-muted-foreground"
              aria-hidden
            >
              {LABELED_WEEKDAY_ROWS.includes(i) ? d : ""}
            </span>
          ))}
        </div>

        {columns.map((col, ci) => (
          <div key={ci} className="flex shrink-0 flex-col gap-[3px]">
            <span className="h-3 w-[11px] overflow-visible whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground">
              {monthLabels[ci] ?? ""}
            </span>
            {col.map((cell) => {
              const weekday = WEEKDAY_LABELS[new Date(cell.date).getDay()];
              return (
                <div
                  key={cell.date}
                  title={
                    cell.isFuture
                      ? cell.date
                      : `${cell.date} · ${formatDuration(cell.minutes)}`
                  }
                  // Colour alone can't convey the value, so each cell carries a
                  // readable label for assistive tech.
                  aria-label={
                    cell.isFuture
                      ? undefined
                      : `${weekday} ${cell.date}: ${
                          cell.minutes > 0 ? formatDuration(cell.minutes) : "no reading"
                        }`
                  }
                  className={[
                    "h-[11px] w-[11px] shrink-0 rounded-sm",
                    cell.isFuture ? "bg-muted/30" : BUCKET_CLASS[bucket(cell.minutes)],
                    cell.date === todayKey ? "ring-1 ring-primary" : "",
                  ].join(" ")}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
        {BUCKET_LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-sm ${l.cls}`} />
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
