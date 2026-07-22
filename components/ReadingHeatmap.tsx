"use client";

import { Card } from "@/components/ui/card";
import { Heatmap } from "@/components/Heatmap";
import { useCalendarRange } from "@/lib/queries";

const WEEKS = 53; // a full rolling year (GitHub-style)
const PAGES = 3; // ~3 years of history reachable via Prev
const BUFFER_DAYS = (WEEKS * PAGES + 2) * 7; // one fetch covers all pages

// The reading calendar shown on /sessions and /profile/stats. Thin wrapper
// around the shared <Heatmap> (the same grid the Home card uses) so the two can
// never drift apart. `offset` is a controlled prop owned by the page.
export function ReadingHeatmap({
  offset,
  onOffsetChange,
  showCard = true,
}: {
  offset: number;
  onOffsetChange: (next: number) => void;
  showCard?: boolean;
}) {
  const { data: rangeDays = [] } = useCalendarRange(0, BUFFER_DAYS);
  const minutesByDate = new Map(rangeDays.map((d) => [d.date, d.totalMinutes]));

  const body = (
    <Heatmap
      minutesByDate={minutesByDate}
      weeks={WEEKS}
      offset={offset}
      onOffsetChange={onOffsetChange}
      pages={PAGES}
    />
  );

  if (!showCard) return body;
  return (
    <Card title="Reading calendar" subtitle="Last 12 months">
      {body}
    </Card>
  );
}
