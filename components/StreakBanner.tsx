"use client";

import { Flame } from "lucide-react";
import { useSessionStats } from "@/lib/queries";

// A small motivational strip above the library list — streak, pages today,
// hours this week. Reuses the existing session-stats aggregation (already
// computed for StatsView) rather than a new query. Hidden when there's no
// reading history yet, so a brand-new library doesn't show "0 day streak".
export function StreakBanner() {
  const { data } = useSessionStats();
  if (!data || data.sessionCount === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto rounded-2xl border bg-card px-4 py-3 text-sm">
      <span className="inline-flex shrink-0 items-center gap-1.5 font-medium">
        <Flame
          className={
            data.streakDays > 0
              ? "h-4 w-4 fill-orange-500 text-orange-500"
              : "h-4 w-4 text-muted-foreground/50"
          }
        />
        {data.streakDays > 0
          ? `${data.streakDays} day streak`
          : "No active streak"}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {data.pagesToday} page{data.pagesToday === 1 ? "" : "s"} today
      </span>
      <span className="shrink-0 text-muted-foreground">
        {data.hoursThisWeek}h this week
      </span>
    </div>
  );
}
