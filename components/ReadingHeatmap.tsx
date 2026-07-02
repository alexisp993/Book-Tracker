"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/StatsView";
import { useCalendarRange, useSessionStats } from "@/lib/queries";

const COLS = 13; // weeks
const ROWS = 7; // days per week
const DAYS = COLS * ROWS; // 91 days per window

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Minutes-that-day -> intensity bucket (0-4). Thresholds chosen to match
// the legend copy exactly (1-30 / 30-60 / 1-2 hrs / 2+ hrs). Exported for
// reuse by components/HomeReadingCalendarPreviewCard.tsx's mini grid, which
// shares this classification logic without sharing this component's UI.
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

// GitHub-style 13-week x 7-day contribution grid with month range label,
// Prev/Next navigation, and a legend. Backed by the shared calendar-data
// builder (lib/calendarData.ts) via useCalendarRange, the same source used
// by the full calendar page and its export — so this heatmap always agrees
// with the rest of the app. Used by /stats and /sessions.
export function ReadingHeatmap({
  offset,
  onOffsetChange,
  showCard = true,
}: {
  offset: number;
  onOffsetChange: (next: number) => void;
  showCard?: boolean;
}) {
  const { data: stats } = useSessionStats();
  const { data: rangeDays = [] } = useCalendarRange(offset, DAYS);

  if (!stats) return null;
  if (stats.sessionCount === 0) return null;

  const minutesByDay = new Map(rangeDays.map((d) => [d.date, d.totalMinutes]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() - offset * DAYS);

  const cells: { date: string; minutes: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(windowEnd);
    d.setDate(d.getDate() - i);
    const key = isoLocalDate(d);
    cells.push({ date: key, minutes: minutesByDay.get(key) ?? 0 });
  }

  const columns: { date: string; minutes: number }[][] = [];
  for (let c = 0; c < COLS; c++) {
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

      <div className="flex gap-[3px] overflow-x-auto">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date} · ${day.minutes} min`}
                className={[
                  "h-[11px] w-[11px] shrink-0 rounded-sm",
                  BUCKET_CLASS[bucket(day.minutes)],
                  day.date === todayKey ? "ring-1 ring-primary" : "",
                ].join(" ")}
              />
            ))}
          </div>
        ))}
      </div>

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
