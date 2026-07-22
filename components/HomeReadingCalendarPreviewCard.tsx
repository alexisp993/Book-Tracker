"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Flame,
  Lightbulb,
  NotebookText,
} from "lucide-react";
import { TINTS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Heatmap } from "@/components/Heatmap";
import { useCalendarRange, useSessionStats, useStats } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";

const YEARS_BACK = 2; // how far the year nav can page back
const BUFFER_DAYS = (YEARS_BACK + 1) * 371; // one fetch covers every navigable year

// Soft full-card pastel backgrounds, one per tint used on this card's stat
// row — same color families as TINTS's icon-badge classes, just a lower
// opacity so the whole card reads as a tinted panel, not just the icon.
const CARD_TINTS: Record<"amber" | "emerald" | "teal" | "violet", string> = {
  amber: "bg-amber-500/10",
  emerald: "bg-emerald-500/10",
  teal: "bg-teal-500/10",
  violet: "bg-violet-500/10",
};

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

// Home tab widget: a bare header, a full-width GitHub-style heatmap card (the
// shared <Heatmap> — same grid the /sessions and /profile/stats heatmaps use),
// and a reading-summary card of stats + a streak tip. Deep history lives behind
// "See all" → /calendar.
export function HomeReadingCalendarPreviewCard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(currentYear);
  const { data: stats } = useSessionStats();
  const { data: libStats } = useStats();
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);

  // Always render once stats has loaded, even with zero sessions.
  if (!stats) return null;

  const minutesByDate = new Map(rangeDays.map((d) => [d.date, d.totalMinutes]));

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

      <Card>
        <Heatmap
          minutesByDate={minutesByDate}
          year={year}
          onYearChange={setYear}
          minYear={currentYear - YEARS_BACK}
          isEmpty={stats.sessionCount === 0}
        />
      </Card>

      {/* Reading-summary card — stat row + a streak tip banner */}
      <Card className="space-y-4">
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
      </Card>
    </div>
  );
}
