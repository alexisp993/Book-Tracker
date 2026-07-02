import type { CalendarDay } from "@/lib/api";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Minutes -> intensity bucket 0-4. Single definition shared by the live
// monthly calendar grid and the downloaded/exported image, so the two can
// never classify a day's reading intensity differently.
export function bucket(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 90) return 3;
  return 4;
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
