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

// GitHub-style contribution heatmap for a single CALENDAR YEAR (Jan 1 → Dec 31).
// Arrows step whole years; "Today" jumps to the current year. Built with CSS
// Grid — one grid holds a weekday gutter, a month-label row, and the 7×N day
// cells — so:
//   • columns are `1fr`, the grid fills its container (no dead space);
//   • cells are `aspect-square`, so they stay square and size to the width;
//   • month labels are placed at `grid-column`, sitting above the exact week
//     each month starts, and re-align for free as the width changes.
// Days outside the selected year (boundary weeks) and future days render faded.
export function Heatmap({
  minutesByDate,
  year,
  onYearChange,
  minYear,
  isEmpty = false,
}: {
  minutesByDate: Map<string, number>;
  year: number;
  onYearChange: (year: number) => void;
  minYear: number;
  isEmpty?: boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Newest weeks (right edge) first — only matters when the grid overflows.
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [year]);

  const currentYear = new Date().getFullYear();

  // "Today" is inherently client-local, but this component is server-rendered
  // for the initial HTML. Computing it directly in render mismatched the
  // server's clock (UTC on Vercel) against the reader's local clock for
  // several hours out of most days in most timezones — not a rare edge case,
  // a near-daily one — causing both the "today" ring's className and the
  // future-day faded styling to differ between server and client (React
  // error #418). Deferring to an effect means the render that must match the
  // server treats nothing as "today" or "future", and the real values apply
  // a tick later, once mounted.
  const [todayInfo, setTodayInfo] = React.useState<{ date: Date; key: string } | null>(null);
  React.useEffect(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    setTodayInfo({ date, key: isoLocalDate(date) });
  }, []);

  return (
    <div className="space-y-3">
      {/* Toolbar: year label (left) + one grouped nav control (right) */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{year}</p>
        <div className="flex items-center overflow-hidden rounded-lg border bg-background">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            disabled={year <= minYear}
            aria-label="Previous year"
            className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onYearChange(currentYear)}
            disabled={year === currentYear}
            className="h-9 border-x px-3 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            disabled={year >= currentYear}
            aria-label="Next year"
            className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm font-medium">No reading activity yet.</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Start your first reading session to build your reading streak.
          </p>
        </div>
      ) : (
        <YearGrid
          year={year}
          minutesByDate={minutesByDate}
          today={todayInfo?.date ?? null}
          todayKey={todayInfo?.key ?? null}
          scrollRef={scrollRef}
        />
      )}
    </div>
  );
}

function YearGrid({
  year,
  minutesByDate,
  today,
  todayKey,
  scrollRef,
}: {
  year: number;
  minutesByDate: Map<string, number>;
  today: Date | null;
  todayKey: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  // The grid spans whole weeks: from the Sunday on/before Jan 1 to the Saturday
  // on/after Dec 31, so every cell aligns to a weekday row.
  const gridStart = sundayOf(new Date(year, 0, 1));
  const lastDec = new Date(year, 11, 31);
  const totalDays =
    Math.round((lastDec.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const weeks = Math.ceil(totalDays / 7);

  const columns: {
    date: string;
    minutes: number;
    inYear: boolean;
    isFuture: boolean;
  }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < ROWS; d++) {
      const cellDate = addDays(gridStart, w * 7 + d);
      const key = isoLocalDate(cellDate);
      const inYear = cellDate.getFullYear() === year;
      // today === null before mount (see the deferred-effect comment above):
      // nothing is "future" yet, matching the server's render exactly.
      const isFuture = today !== null && cellDate > today;
      col.push({
        date: key,
        minutes: inYear && !isFuture ? minutesByDate.get(key) ?? 0 : 0,
        inYear,
        isFuture,
      });
    }
    columns.push(col);
  }

  // Month labels — one per month, above the first week that contains a day of
  // that month within the year.
  const monthLabels: { col: number; label: string }[] = [];
  const labelledMonths = new Set<number>();
  columns.forEach((col, w) => {
    for (const cell of col) {
      if (!cell.inYear) continue;
      const month = Number(cell.date.slice(5, 7)) - 1;
      if (!labelledMonths.has(month)) {
        labelledMonths.add(month);
        monthLabels.push({ col: w, label: SHORT_MONTHS[month] });
      }
      break;
    }
  });

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* Min-width keeps cells ≥~11px: scroll on narrow screens rather than
          shrinking. On wider containers the 1fr columns expand to fill. */}
      <div className="min-w-[760px]">
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `1.5rem repeat(${weeks}, minmax(0, 1fr))`,
            // A tall label row leaves a comfortable gap between the month
            // labels and the grid (item: more top padding).
            gridTemplateRows: `1.5rem repeat(${ROWS}, auto)`,
          }}
        >
          {/* Month labels — row 1, above their starting week column */}
          {monthLabels.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              style={{ gridColumn: m.col + 2, gridRow: 1 }}
              className="self-start whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground"
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
              const muted = !cell.inYear || cell.isFuture;
              const weekday = WEEKDAY_LABELS[new Date(cell.date).getDay()];
              return (
                <div
                  key={cell.date}
                  style={{ gridColumn: w + 2, gridRow: d + 2 }}
                  title={
                    muted
                      ? undefined
                      : `${cell.date} · ${formatDuration(cell.minutes)}`
                  }
                  aria-label={
                    muted
                      ? undefined
                      : `${weekday} ${cell.date}: ${
                          cell.minutes > 0 ? formatDuration(cell.minutes) : "no reading"
                        }`
                  }
                  className={[
                    "aspect-square rounded-[3px]",
                    muted
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

      {/* Legend — a small title over a GitHub-style Less→More scale */}
      <div className="mt-3">
        <p className="text-caption-sm font-medium text-muted-foreground">Daily Reading</p>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {BUCKET_LEGEND.map((l) => (
            <span key={l.label} className={`h-2.5 w-2.5 rounded-[2px] ${l.cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
