"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const ROWS = 7; // Sun..Sat

// GitHub-style contribution heatmap. Deliberately built with CSS Grid rather
// than fixed pixel widths so it satisfies three requirements at once:
//   • the grid fills its container (columns are `1fr`), leaving no dead space;
//   • cells stay perfectly square (`aspect-square` derives height from the
//     resolved column width);
//   • month labels sit above the exact week each month starts, because they're
//     placed into the SAME grid via `grid-column` — no pixel maths, no
//     `justify-between`, and they re-align automatically as the width changes.
// A single grid holds a weekday gutter column, a month-label row, and the
// 7×N day cells, so everything is aligned by construction. On narrow screens a
// min-width forces horizontal scroll instead of shrinking the cells to mush.
export function Heatmap({
  minutesByDate,
  weeks = 53,
  offset,
  onOffsetChange,
  pages = 2,
}: {
  minutesByDate: Map<string, number>;
  weeks?: number;
  offset: number;
  onOffsetChange: (next: number) => void;
  pages?: number;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Start scrolled to the newest weeks (far right) on mount and after paging —
  // only matters on narrow screens where the grid overflows and scrolls.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [offset, weeks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = isoLocalDate(today);

  // Sunday-aligned columns (matches GitHub and the monthly grid). The newest
  // page ends at the week containing today; each page steps back `weeks`.
  const lastColSunday = addDays(sundayOf(today), -offset * weeks * 7);
  const firstColSunday = addDays(lastColSunday, -(weeks - 1) * 7);

  const columns: { date: string; minutes: number; isFuture: boolean }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < ROWS; d++) {
      const cellDate = addDays(firstColSunday, w * 7 + d);
      const key = isoLocalDate(cellDate);
      col.push({
        date: key,
        minutes: minutesByDate.get(key) ?? 0,
        isFuture: cellDate > today,
      });
    }
    columns.push(col);
  }

  // Month labels — GitHub's algorithm: a label sits above the first column
  // that introduces a new month, skipping labels that would crowd the previous
  // one (< 3 columns apart), so a short leading month doesn't collide with the
  // next. Keyed by YYYY-MM so a rolling year labels a repeated month twice.
  const monthLabels: { col: number; label: string }[] = [];
  const seenMonths = new Set<string>();
  let lastLabelCol = -99;
  columns.forEach((col, w) => {
    for (const cell of col) {
      const key = cell.date.slice(0, 7); // YYYY-MM
      if (!seenMonths.has(key)) {
        seenMonths.add(key);
        if (w - lastLabelCol >= 3) {
          monthLabels.push({
            col: w,
            label: SHORT_MONTHS[Number(cell.date.slice(5, 7)) - 1],
          });
          lastLabelCol = w;
        }
        break;
      }
    }
  });

  const firstCell = columns[0][0].date;
  const lastCell = columns[weeks - 1][ROWS - 1].date;
  const rangeLabel = (() => {
    const [fy, fm] = firstCell.split("-").map(Number);
    const [ly, lm] = lastCell.split("-").map(Number);
    const start = fy === ly ? SHORT_MONTHS[fm - 1] : `${SHORT_MONTHS[fm - 1]} ${fy}`;
    return `${start} – ${SHORT_MONTHS[lm - 1]} ${ly}`;
  })();

  const canGoBack = offset < pages - 1;
  const canGoForward = offset > 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{rangeLabel}</p>
        <div className="flex items-center gap-1">
          <NavButton
            onClick={() => onGuardedChange(onOffsetChange, offset + 1, canGoBack)}
            disabled={!canGoBack}
            label="Earlier weeks"
          >
            <ChevronLeft className="h-4 w-4" />
          </NavButton>
          <button
            type="button"
            onClick={() => onOffsetChange(0)}
            disabled={!canGoForward}
            className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Today
          </button>
          <NavButton
            onClick={() => onGuardedChange(onOffsetChange, offset - 1, canGoForward)}
            disabled={!canGoForward}
            label="Later weeks"
          >
            <ChevronRight className="h-4 w-4" />
          </NavButton>
        </div>
      </div>

      {/* Grid — scrolls horizontally on narrow screens (scrollbar hidden),
          fills the container on wider ones. */}
      <div
        ref={scrollRef}
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Min-width keeps cells ≥~11px (≈ 24px gutter + 53×11 + gaps): the
            grid scrolls on narrow screens rather than shrinking the cells. On
            wider containers the 1fr columns expand to fill the space. */}
        <div className="min-w-[760px]">
          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: `1.5rem repeat(${weeks}, minmax(0, 1fr))`,
              gridTemplateRows: `auto repeat(${ROWS}, auto)`,
            }}
          >
            {/* Month labels (row 1, placed above their starting week column) */}
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                style={{ gridColumn: m.col + 2, gridRow: 1 }}
                className="self-end whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground"
              >
                {m.label}
              </span>
            ))}

            {/* Weekday gutter (column 1) — Mon/Wed/Fri labelled, like GitHub */}
            {WEEKDAY_INITIALS.map((d, i) => (
              <span
                key={`wd-${i}`}
                style={{ gridColumn: 1, gridRow: i + 2 }}
                className="flex items-center justify-end pr-1 text-[10px] leading-none text-muted-foreground"
                aria-hidden
              >
                {LABELED_WEEKDAY_ROWS.includes(i) ? d : ""}
              </span>
            ))}

            {/* Day cells */}
            {columns.map((col, w) =>
              col.map((cell, d) => {
                const weekday = WEEKDAY_LABELS[new Date(cell.date).getDay()];
                return (
                  <div
                    key={cell.date}
                    style={{ gridColumn: w + 2, gridRow: d + 2 }}
                    title={
                      cell.isFuture
                        ? cell.date
                        : `${cell.date} · ${formatDuration(cell.minutes)}`
                    }
                    aria-label={
                      cell.isFuture
                        ? undefined
                        : `${weekday} ${cell.date}: ${
                            cell.minutes > 0 ? formatDuration(cell.minutes) : "no reading"
                          }`
                    }
                    className={[
                      "aspect-square rounded-[3px]",
                      cell.isFuture
                        ? "bg-[var(--heat-0)] opacity-40"
                        : BUCKET_CLASS[bucket(cell.minutes)],
                      cell.date === todayKey ? "ring-1 ring-foreground" : "",
                    ].join(" ")}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
        <span className="mr-auto sm:mr-0">Less</span>
        {BUCKET_LEGEND.map((l) => (
          <span key={l.label} className={`h-2.5 w-2.5 rounded-[2px] ${l.cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function onGuardedChange(
  fn: (n: number) => void,
  next: number,
  allowed: boolean,
) {
  if (allowed) fn(Math.max(0, next));
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background transition-colors hover:bg-secondary disabled:opacity-40"
    >
      {children}
    </button>
  );
}
