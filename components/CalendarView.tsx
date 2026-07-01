"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useCalendar } from "@/lib/queries";
import type { CalendarDay } from "@/lib/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Minutes -> intensity bucket 0-4
function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 90) return 3;
  return 4;
}

const BUCKET_BG = [
  "",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/65",
  "bg-primary",
];

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function CalendarView() {
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const { data: calData = [], isLoading } = useCalendar(year, month);

  const byDay = new Map(calData.map((d) => [d.date, d]));

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }
  function canGoNext() {
    return year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
  }

  // Build a grid that starts on the correct weekday
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstOfMonth.getDay(); // 0=Sun

  // Cells: null for leading empty slots, then 1..daysInMonth
  const cells: (number | null)[] = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const selectedDay = selectedDate ? byDay.get(selectedDate) : null;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext()}
          className="flex h-8 w-8 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary disabled:opacity-40"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <p key={d} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </p>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />;
            }
            const key = dateKey(day);
            const data = byDay.get(key);
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() + 1 &&
              year === today.getFullYear();
            const isSelected = selectedDate === key;
            const b = bucket(data?.totalMinutes ?? 0);
            const hasData = (data?.sessions.length ?? 0) > 0;
            const cover = data?.sessions.find((s) => s.coverUrl)?.coverUrl;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={[
                  "relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border text-sm transition-all",
                  isSelected
                    ? "border-primary ring-1 ring-primary"
                    : "border-transparent hover:border-border",
                  b > 0 ? BUCKET_BG[b] : "bg-muted/30",
                  isToday && !isSelected ? "font-bold" : "",
                ].join(" ")}
                aria-label={`${key}${data ? `, ${data.totalMinutes} min` : ""}`}
              >
                {cover && hasData ? (
                  <div className="absolute inset-0 overflow-hidden rounded-[10px] opacity-25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <span className="relative z-10 text-xs leading-none">
                  {day}
                </span>
                {hasData ? (
                  <span className="relative z-10 mt-0.5 h-1 w-1 rounded-full bg-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Day detail panel */}
      {selectedDay ? (
        <DayDetail day={selectedDay} />
      ) : null}
    </div>
  );
}

function DayDetail({ day }: { day: CalendarDay }) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{day.date}</p>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {day.totalMinutes > 0 ? (
            <span>⏱ {formatDuration(day.totalMinutes)}</span>
          ) : null}
          {day.totalPages > 0 ? (
            <span>📖 {day.totalPages} pages</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {day.sessions.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            {s.coverUrl ? (
              <div className="h-12 w-8 shrink-0 overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.coverUrl}
                  alt={s.bookTitle}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-8 shrink-0 rounded-lg border bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">{s.bookTitle}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  s.minutes ? formatDuration(s.minutes) : null,
                  s.pagesRead ? `${s.pagesRead} pages` : null,
                  s.mood
                    ? `${MOOD_EMOJI[s.mood as keyof typeof MOOD_EMOJI] ?? ""} ${MOOD_LABELS[s.mood as keyof typeof MOOD_LABELS] ?? s.mood}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
