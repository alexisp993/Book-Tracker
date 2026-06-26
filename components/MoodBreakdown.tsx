"use client";

import { Card } from "@/components/StatsView";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { useSessionStats } from "@/lib/queries";

// Mirrors StatsView's "By status"/"Ratings" horizontal-bar pattern, using a
// single consistent bar tint (moods have no per-mood color mapping, same as
// how "Ratings" uses one amber tint for every row rather than per-star colors).
export function MoodBreakdown() {
  const { data } = useSessionStats();
  if (!data || data.moodBreakdown.length === 0) return null;

  const max = Math.max(1, ...data.moodBreakdown.map((m) => m.count));

  return (
    <Card title="Mood history" subtitle="How you've been feeling">
      <div className="space-y-2.5">
        {data.moodBreakdown.map((m) => (
          <div key={m.mood} className="flex items-center gap-3">
            <span className="flex w-28 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-base leading-none">{MOOD_EMOJI[m.mood]}</span>
              {MOOD_LABELS[m.mood]}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(m.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-medium">
              {m.count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
