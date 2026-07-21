"use client";

import { BookOpen, Clock, Flame } from "lucide-react";
import { Stat } from "@/components/ui/stat";
import { useSessionStats } from "@/lib/queries";

// Today / this week / streak tiles, mirroring StatsView's own stat-card
// grid. Surfaces streakDays on the Sessions page for the first time (today
// it's Library-only via StreakBanner).
export function SessionSummaryStats() {
  const { data } = useSessionStats();
  if (!data || data.sessionCount === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        icon={<Clock className="h-4 w-4" />}
        label="Today"
        tint="teal"
        value={`${data.hoursToday}h`}
      />
      <Stat
        icon={<BookOpen className="h-4 w-4" />}
        label="Pages today"
        tint="violet"
        value={data.pagesToday}
      />
      <Stat
        icon={<Clock className="h-4 w-4" />}
        label="This week"
        tint="teal"
        value={`${data.hoursThisWeek}h`}
      />
      <Stat
        icon={<Flame className="h-4 w-4" />}
        label="Streak"
        tint="amber"
        value={`${data.streakDays}d`}
      />
    </div>
  );
}
