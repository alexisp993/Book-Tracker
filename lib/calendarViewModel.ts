import type { CalendarDay } from "@/lib/api";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Single-letter row labels for the compact contribution-style grids.
export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

// Only alternating rows carry a label (Mon / Wed / Fri), matching GitHub's
// contribution graph. Labelling all seven forces the type down to an
// illegible size; labelling three keeps the axis readable at 10px.
export const LABELED_WEEKDAY_ROWS = [1, 3, 5];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---------------------------------------------------------------------------
// Reading-intensity scale — THE single definition for the whole app.
//
// Every surface that colours a day by how long it was read imports from here:
// the monthly calendar grid, its canvas export, the /sessions + /profile/stats
// heatmap, and the Home preview card. These previously carried three separate
// ramps (the calendar used 20/45/90 while the heatmaps used 30/60/120), so the
// same 40-minute session rendered as a different intensity depending on which
// screen you were looking at. Keep this as the only copy.
// ---------------------------------------------------------------------------

export function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 30) return 1;
  if (minutes <= 60) return 2;
  if (minutes <= 120) return 3;
  return 4;
}

// A dedicated GitHub-style green ramp (theme-aware via CSS vars in
// globals.css), independent of --primary. Level 0 = empty; 1-4 ramp with
// reading duration.
export const BUCKET_CLASS = [
  "bg-[var(--heat-0)]",
  "bg-[var(--heat-1)]",
  "bg-[var(--heat-2)]",
  "bg-[var(--heat-3)]",
  "bg-[var(--heat-4)]",
];

// The CSS-variable names the canvas export reads (a <canvas> can't consume
// Tailwind classes), so the downloaded image uses the same green ramp.
export const BUCKET_VARS = [
  "--heat-0",
  "--heat-1",
  "--heat-2",
  "--heat-3",
  "--heat-4",
];

export const BUCKET_LEGEND = [
  { label: "None", cls: BUCKET_CLASS[0] },
  { label: "1–30m", cls: BUCKET_CLASS[1] },
  { label: "30–60m", cls: BUCKET_CLASS[2] },
  { label: "1–2h", cls: BUCKET_CLASS[3] },
  { label: "2h+", cls: BUCKET_CLASS[4] },
];

// Local-timezone YYYY-MM-DD key. Deliberately not toISOString(), which would
// shift the date for anyone west of UTC.
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Sunday of the week containing d. Sunday-first is the app-wide rule: it
// matches GitHub's contribution graph and the monthly grid below, which
// already pads from firstOfMonth.getDay().
export function sundayOf(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface MonthGridCell {
  day: number | null; // null = a leading/trailing empty cell
  dateKey: string | null;
  data: CalendarDay | undefined;
  isToday: boolean;
  bucket: number;
  hasCover: boolean;
  coverCandidates: string[];
  hasData: boolean;
  extraBookCount: number;
}

export interface MonthCalendarViewModel {
  monthLabel: string; // e.g. "June 2026"
  weekdayLabels: string[];
  cells: MonthGridCell[]; // always a multiple of 7
  daysInMonth: number;
  startDow: number;
  summary: {
    daysRead: number;
    totalMinutes: number;
    totalPages: number;
  };
}

// Single source of truth for "how a month's calendar grid is laid out" —
// consumed identically by the live CalendarView grid and by
// downloadCalendarImage() (both in components/CalendarView.tsx), so
// leading/trailing empty cells, day-to-cell mapping, reading-intensity
// buckets, and the month summary can never diverge between the on-screen
// calendar and the exported image.
export function buildMonthCalendarViewModel(
  year: number,
  month: number, // 1-12
  calData: CalendarDay[],
  today: Date = new Date(),
): MonthCalendarViewModel {
  const byDay = new Map(calData.map((d) => [d.date, d]));

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstOfMonth.getDay();

  const dayNumbers: (number | null)[] = [
    ...Array.from({ length: startDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (dayNumbers.length % 7 !== 0) dayNumbers.push(null);

  const isTodayCell = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() + 1 &&
    year === today.getFullYear();

  const cells: MonthGridCell[] = dayNumbers.map((day) => {
    if (day === null) {
      return {
        day: null,
        dateKey: null,
        data: undefined,
        isToday: false,
        bucket: 0,
        hasCover: false,
        coverCandidates: [],
        hasData: false,
        extraBookCount: 0,
      };
    }
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const data = byDay.get(dateKey);
    const coverCandidates = data?.primary?.coverCandidates ?? [];
    return {
      day,
      dateKey,
      data,
      isToday: isTodayCell(day),
      bucket: bucket(data?.totalMinutes ?? 0),
      hasCover: coverCandidates.length > 0,
      coverCandidates,
      hasData: (data?.sessions.length ?? 0) > 0,
      extraBookCount: data?.extraBookCount ?? 0,
    };
  });

  return {
    monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
    weekdayLabels: WEEKDAY_LABELS,
    cells,
    daysInMonth,
    startDow,
    summary: {
      daysRead: calData.length,
      totalMinutes: calData.reduce((s, d) => s + d.totalMinutes, 0),
      totalPages: calData.reduce((s, d) => s + d.totalPages, 0),
    },
  };
}
