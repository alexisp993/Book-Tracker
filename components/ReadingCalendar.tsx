"use client";

import { Card } from "@/components/StatsView";
import { useSessionStats } from "@/lib/queries";

const COLS = 13;
const ROWS = 7;
const DAYS = COLS * ROWS;

// Minutes-that-day -> intensity bucket (0-4), tuned for casual daily reading
// sessions (most days are 0-90 minutes).
function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 90) return 3;
  return 4;
}

const BUCKET_CLASS = [
  "bg-muted",
  "bg-primary/15",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
];

function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GitHub-style contribution grid — last 13 weeks x 7 days, built client-side
// from the sparse `last90Days` field already computed server-side in
// getSessionStats(). No charting library; plain CSS grid + opacity steps on
// the existing --primary token.
export function ReadingCalendar() {
  const { data } = useSessionStats();
  if (!data || data.sessionCount === 0) return null;

  const minutesByDay = new Map(data.last90Days.map((d) => [d.date, d.minutes]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells: { date: string; minutes: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoLocalDate(d);
    cells.push({ date: key, minutes: minutesByDay.get(key) ?? 0 });
  }

  // Reshape into week-major columns (oldest week left, newest right) so the
  // grid reads top-to-bottom within a week, left-to-right across weeks.
  const columns: { date: string; minutes: number }[][] = [];
  for (let c = 0; c < COLS; c++) {
    columns.push(cells.slice(c * ROWS, c * ROWS + ROWS));
  }

  return (
    <Card title="Reading calendar" subtitle="Last 13 weeks">
      <div className="flex gap-[3px] overflow-x-auto">
        {columns.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date} · ${day.minutes} min`}
                className={`h-[11px] w-[11px] shrink-0 rounded-sm ${BUCKET_CLASS[bucket(day.minutes)]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
