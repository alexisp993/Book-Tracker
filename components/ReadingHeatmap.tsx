"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Heatmap } from "@/components/Heatmap";
import { useCalendarRange, useSessionStats } from "@/lib/queries";

const YEARS_BACK = 3; // how far the year nav can page back
const BUFFER_DAYS = (YEARS_BACK + 1) * 371; // one fetch covers every navigable year

// The reading calendar shown on /sessions and /profile/stats. Self-contained:
// owns its own year state and renders the shared <Heatmap> (the same grid the
// Home card uses), so the two can never drift apart.
export function ReadingHeatmap({ showCard = true }: { showCard?: boolean }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(currentYear);
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);
  const { data: stats } = useSessionStats();

  const minutesByDate = new Map(rangeDays.map((d) => [d.date, d.totalMinutes]));

  const body = (
    <Heatmap
      minutesByDate={minutesByDate}
      year={year}
      onYearChange={setYear}
      minYear={currentYear - YEARS_BACK}
      isEmpty={stats?.sessionCount === 0}
    />
  );

  if (!showCard) return body;
  return (
    <Card title="Reading calendar" subtitle="Daily reading activity">
      {body}
    </Card>
  );
}
