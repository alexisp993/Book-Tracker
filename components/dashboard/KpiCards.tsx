"use client";

import { BookCheck, Clock, Flame, FileText } from "lucide-react";
import { Stat } from "@/components/ui/stat";
import { useSessionStats, useStats } from "@/lib/queries";

// The top KPI row: streak / pages today / time this week / books finished this
// year. Every value is real — no fabricated "daily goal" line (the app has no
// daily-pages goal).
export function KpiCards() {
  const { data: session } = useSessionStats();
  const { data: stats } = useStats();

  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        className="h-full"
        icon={<Flame className="h-4 w-4" />}
        label="Day streak"
        tint="amber"
        value={session?.streakDays ?? 0}
        caption={session && session.streakDays > 0 ? "Keep it going!" : "Start today!"}
      />
      <Stat
        className="h-full"
        icon={<FileText className="h-4 w-4" />}
        label="Pages today"
        tint="violet"
        value={session?.pagesToday ?? 0}
      />
      <Stat
        className="h-full"
        icon={<Clock className="h-4 w-4" />}
        label="Read this week"
        tint="teal"
        value={`${session?.hoursThisWeek ?? 0}h`}
      />
      <Stat
        className="h-full"
        icon={<BookCheck className="h-4 w-4" />}
        label="Books finished"
        tint="emerald"
        value={stats?.booksThisYear ?? 0}
        caption="This year"
      />
    </div>
  );
}
