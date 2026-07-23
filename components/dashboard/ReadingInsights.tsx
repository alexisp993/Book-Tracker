"use client";

import { BookOpen, Clock, FileText, Flame } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { useSessionStats, useStats } from "@/lib/queries";

// Four this-year insight tiles with real year-over-year deltas (from the stats
// endpoint's YoY fields) and the real longest-streak for the streak caption.
// Weekly deltas are deliberately absent — the backend has no week-over-week.
export function ReadingInsights() {
  const { data: stats } = useStats();
  const { data: session } = useSessionStats();

  return (
    <div className="grid h-full flex-1 grid-cols-2 grid-rows-2 gap-3">
      <InsightCard
        icon={<BookOpen className="h-4 w-4" />}
        tint="emerald"
        label="Books Read"
        value={(stats?.booksThisYear ?? 0).toLocaleString()}
        yoyPct={stats?.booksYoyPct ?? null}
      />
      <InsightCard
        icon={<FileText className="h-4 w-4" />}
        tint="blue"
        label="Pages Read"
        value={(stats?.pagesThisYear ?? 0).toLocaleString()}
        yoyPct={stats?.pagesYoyPct ?? null}
      />
      <InsightCard
        icon={<Clock className="h-4 w-4" />}
        tint="amber"
        label="Time Read"
        value={formatDuration(stats?.minutesThisYear ?? 0)}
        yoyPct={stats?.timeReadYoyPct ?? null}
      />
      <InsightCard
        icon={<Flame className="h-4 w-4" />}
        tint="rose"
        label="Current Streak"
        value={`${session?.streakDays ?? 0}`}
        caption={
          session?.longestStreakDays
            ? `Best: ${session.longestStreakDays} days`
            : undefined
        }
      />
    </div>
  );
}

const TINTS: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

function InsightCard({
  icon,
  tint,
  label,
  value,
  yoyPct,
  caption,
}: {
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  label: string;
  value: string;
  yoyPct?: number | null;
  caption?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TINTS[tint]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold leading-tight">{value}</p>
          <p className="truncate text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
      {yoyPct != null ? (
        <p
          className={cn(
            "mt-auto pt-1.5 text-[11px] font-medium",
            yoyPct >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400",
          )}
        >
          {yoyPct >= 0 ? "▲" : "▼"} {Math.abs(yoyPct)}% vs last year
        </p>
      ) : caption ? (
        <p className="mt-auto pt-1.5 text-[11px] text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
}
