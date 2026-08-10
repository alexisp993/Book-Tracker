"use client";

import { Band } from "@/components/ui/section";
import { BarRow } from "@/components/ui/bar";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useSessionStats } from "@/lib/queries";

// Uses the shared BarRow, same as StatsView's status/ratings/genre lists, with
// a single consistent bar tint (moods have no per-mood color mapping, same as
// how "Ratings" uses one amber tint for every row rather than per-star colors).
export function MoodBreakdown() {
  const { data } = useSessionStats();
  if (!data || data.moodBreakdown.length === 0) return null;

  const max = Math.max(1, ...data.moodBreakdown.map((m) => m.count));

  return (
    <Band label="How you've been feeling">
      <div className="max-w-2xl space-y-2.5">
        {data.moodBreakdown.map((m) => (
          <BarRow
            key={m.mood}
            label={
              <>
                <span className="text-base leading-none">{MOOD_EMOJI[m.mood]}</span>
                {MOOD_LABELS[m.mood]}
              </>
            }
            labelClassName="flex w-28 items-center gap-1.5"
            value={m.count}
            max={max}
            fillClass="bg-primary/70"
          />
        ))}
      </div>
    </Band>
  );
}
