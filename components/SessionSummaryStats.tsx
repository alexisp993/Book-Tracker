"use client";

import type * as React from "react";
import { Band } from "@/components/ui/section";
import { useSessionStats } from "@/lib/queries";

// Today / this week / streak, as figures rather than four tinted tiles.
//
// This used to render `Stat` with teal, violet, teal and amber icon pucks —
// four hues across four boxes, none of them meaning anything. Same treatment
// the Statistics screen already moved to: a number, its name, a hairline.
export function SessionSummaryStats() {
  const { data } = useSessionStats();
  if (!data || data.sessionCount === 0) return null;

  return (
    <Band label="Where you are" divider={false}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
        <Figure label="Today" value={`${data.hoursToday}h`} />
        <Figure label="Pages today" value={data.pagesToday} />
        <Figure label="This week" value={`${data.hoursThisWeek}h`} />
        <Figure
          label="Streak"
          value={data.streakDays > 0 ? `${data.streakDays}d` : "—"}
        />
      </dl>
    </Band>
  );
}

function Figure({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l border-border/60 pl-3">
      <dt className="text-caption-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
