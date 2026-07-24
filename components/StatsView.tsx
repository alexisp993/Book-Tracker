"use client";

import type * as React from "react";
import { useMemo, useState } from "react";
import {
  BookCheck,
  BookOpen,
  Clock,
  Flame,
  Heart,
  Star,
  Timer,
  Trophy,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { useSessionStats, useStats } from "@/lib/queries";
import { STATUS_DOT } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { ReadingHeatmap } from "@/components/ReadingHeatmap";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Stat } from "@/components/ui/stat";
import { BarRow } from "@/components/ui/bar";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs, type TabItem } from "@/components/ui/tabs";

type Tab = "overview" | "books" | "sessions" | "time";

const TABS: readonly TabItem<Tab>[] = [
  { value: "overview", label: "Overview" },
  { value: "books", label: "Books" },
  { value: "sessions", label: "Sessions" },
  { value: "time", label: "Time" },
];

export function StatsView() {
  const { data: stats, isLoading: loading } = useStats();
  const { data: sessionStats } = useSessionStats();
  const [tab, setTab] = useState<Tab>("overview");

  // The header renders in every state — loading and empty included — so the
  // screen never appears untitled while data resolves.
  if (loading || !stats || stats.total === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistics" />
        {loading ? (
          <Loading />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No stats yet"
            description="Add and finish some books to see your reading insights."
          />
        )}
      </div>
    );
  }

  const maxMonth = Math.max(1, ...stats.booksPerMonth.map((m) => m.count));
  const maxStatus = Math.max(1, ...stats.byStatus.map((s) => s.count));
  const maxRating = Math.max(1, ...stats.ratingDistribution.map((r) => r.count));
  const maxGenre = Math.max(1, ...stats.genreBreakdown.map((g) => g.count));

  const totalMinutesThisYear = stats.minutesPerMonth.reduce((sum, m) => sum + m.minutes, 0);
  const totalBooksThisYear = stats.booksPerMonth.reduce((sum, m) => sum + m.count, 0);
  const totalPagesThisYear = stats.pagesPerMonth.reduce((sum, m) => sum + m.pages, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistics"
        actions={<span className="text-sm text-muted-foreground">This Year</span>}
      />

      <SegmentedTabs value={tab} onChange={setTab} items={TABS} />

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            <Stat icon={<BookOpen className="h-4 w-4" />} label="Total" tint="blue" value={stats.total} />
            <Stat icon={<BookCheck className="h-4 w-4" />} label="Read" tint="emerald" value={stats.read} />
            <Stat icon={<Flame className="h-4 w-4" />} label="Reading" tint="amber" value={stats.reading} />
            <Stat
              icon={<BookOpen className="h-4 w-4" />}
              label="Pages read"
              tint="violet"
              value={stats.pagesRead.toLocaleString()}
            />
            <Stat icon={<Heart className="h-4 w-4" />} label="Favorites" tint="rose" value={stats.favorites} />
            <Stat
              icon={<Star className="h-4 w-4" />}
              label="Avg rating"
              tint="amber"
              value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
            />
          </div>

          <TimeReadChart
            minutesPerMonth={stats.minutesPerMonth}
            totalMinutes={totalMinutesThisYear}
            yoyPct={stats.timeReadYoyPct}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Sparkline
              title="Books Read"
              value={totalBooksThisYear.toLocaleString()}
              yoyPct={stats.booksYoyPct}
              points={stats.booksPerMonth.map((m) => m.count)}
              tint="emerald"
            />
            <Sparkline
              title="Pages Read"
              value={totalPagesThisYear.toLocaleString()}
              yoyPct={stats.pagesYoyPct}
              points={stats.pagesPerMonth.map((m) => m.pages)}
              tint="violet"
            />
          </div>

          {sessionStats ? <LongestStreakCard sessionStats={sessionStats} /> : null}
        </div>
      ) : null}

      {tab === "books" ? (
        <div className="space-y-3">
          <Card title="Books finished" subtitle="Last 12 months">
            <div className="flex h-40 items-end gap-1.5">
              {stats.booksPerMonth.map((m) => (
                <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      role="img"
                      aria-label={`${m.label}: ${m.count} book${m.count === 1 ? "" : "s"}`}
                      className="w-full rounded-t-md bg-primary/80 transition-all"
                      style={{
                        height: `${(m.count / maxMonth) * 100}%`,
                        minHeight: m.count > 0 ? 3 : 0,
                      }}
                      title={`${m.count} in ${m.label}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card title="By status">
              <div className="space-y-2.5">
                {stats.byStatus.map((s) => (
                  <BarRow
                    key={s.status}
                    label={s.label}
                    value={s.count}
                    max={maxStatus}
                    fillClass={STATUS_DOT[s.status as keyof typeof STATUS_DOT]}
                  />
                ))}
              </div>
            </Card>

            <Card title="Ratings" subtitle={`${stats.ratedCount} rated`}>
              <div className="space-y-2.5">
                {[...stats.ratingDistribution].reverse().map((r) => (
                  <BarRow
                    key={r.rating}
                    label={
                      <>
                        {r.rating}
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </>
                    }
                    labelClassName="flex w-12 items-center gap-0.5"
                    value={r.count}
                    max={maxRating}
                    fillClass="bg-amber-400"
                  />
                ))}
              </div>
            </Card>
          </div>

          {stats.genreBreakdown.length > 0 ? (
            <Card title="Favorite genres">
              <div className="space-y-2.5">
                {stats.genreBreakdown.map((g) => (
                  <BarRow
                    key={g.name}
                    label={g.name}
                    value={g.count}
                    max={maxGenre}
                    fillClass="bg-violet-500"
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {stats.topAuthors.length > 0 ? (
            <Card title="Most-read authors">
              <ul className="divide-y divide-border/60">
                {stats.topAuthors.map((a, i) => (
                  <li
                    key={a.name}
                    className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                  >
                    <span className="w-5 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 font-medium">{a.name}</span>
                    <span className="text-muted-foreground">
                      {a.count} book{a.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "sessions" ? (
        <div className="space-y-3">
          {sessionStats && sessionStats.sessionCount > 0 ? (
            <Card title="Reading activity" subtitle={`${sessionStats.sessionCount} sessions logged`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  icon={<Clock className="h-4 w-4" />}
                  label="Lifetime hours"
                  tint="teal"
                  value={(sessionStats.totalMinutes / 60).toFixed(1)}
                />
                <Stat
                  icon={<Timer className="h-4 w-4" />}
                  label="Avg pace"
                  tint="violet"
                  value={
                    sessionStats.avgPagesPerHour
                      ? `${sessionStats.avgPagesPerHour} pg/hr`
                      : "—"
                  }
                />
                <Stat icon={<Clock className="h-4 w-4" />} label="This week" tint="teal" value={`${sessionStats.hoursThisWeek}h`} />
                <Stat icon={<Clock className="h-4 w-4" />} label="This month" tint="teal" value={`${sessionStats.hoursThisMonth}h`} />
              </div>
            </Card>
          ) : null}

          <ReadingHeatmap />
        </div>
      ) : null}

      {tab === "time" ? (
        <TimeReadChart
          minutesPerMonth={stats.minutesPerMonth}
          totalMinutes={totalMinutesThisYear}
          yoyPct={stats.timeReadYoyPct}
        />
      ) : null}
    </div>
  );
}

function YoyDelta({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "text-sm font-medium",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}% vs last year
    </span>
  );
}

function TimeReadChart({
  minutesPerMonth,
  totalMinutes,
  yoyPct,
}: {
  minutesPerMonth: { month: string; label: string; minutes: number }[];
  totalMinutes: number;
  yoyPct: number | null;
}) {
  const maxIdx = useMemo(() => {
    let best = 0;
    for (let i = 1; i < minutesPerMonth.length; i++) {
      if (minutesPerMonth[i].minutes > minutesPerMonth[best].minutes) best = i;
    }
    return best;
  }, [minutesPerMonth]);
  const [focusIndex, setFocusIndex] = useState(maxIdx);

  const max = Math.max(1, ...minutesPerMonth.map((m) => m.minutes));
  const focused = minutesPerMonth[focusIndex];

  return (
    <Card title="Time Read">
      <div className="mb-4">
        <p className="font-display text-3xl font-bold">{formatDuration(totalMinutes)}</p>
        <YoyDelta pct={yoyPct} />
      </div>

      <div className="relative flex h-40 items-end gap-1.5">
        {focused ? (
          <div
            className="pointer-events-none absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background"
            style={{
              left: `${((focusIndex + 0.5) / minutesPerMonth.length) * 100}%`,
            }}
          >
            {focused.label} / {formatDuration(focused.minutes)}
          </div>
        ) : null}
        {minutesPerMonth.map((m, i) => (
          <div key={m.month} className="flex h-full flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <button
                type="button"
                onClick={() => setFocusIndex(i)}
                aria-label={`${m.label}: ${formatDuration(m.minutes)}`}
                aria-pressed={i === focusIndex}
                className={cn(
                  "w-full rounded-t-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === focusIndex ? "bg-primary" : "bg-primary/40 hover:bg-primary/60",
                )}
                style={{
                  height: `${(m.minutes / max) * 100}%`,
                  // Keep a read month visibly non-zero next to a much bigger one.
                  minHeight: m.minutes > 0 ? 3 : 0,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Sparkline({
  title,
  value,
  yoyPct,
  points,
  tint,
}: {
  title: string;
  value: string;
  yoyPct: number | null;
  points: number[];
  tint: "emerald" | "violet";
}) {
  const w = 100;
  const h = 32;
  const max = Math.max(1, ...points);
  const coords = points
    .map((p, i) => {
      const x = points.length > 1 ? (i / (points.length - 1)) * w : 0;
      const y = h - (p / max) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const stroke = tint === "emerald" ? "rgb(16 185 129)" : "rgb(139 92 246)";

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold">{value}</p>
      <div className="mt-1">
        <YoyDelta pct={yoyPct} />
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-10 w-full" preserveAspectRatio="none">
        <polyline
          points={coords}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Card>
  );
}

function LongestStreakCard({
  sessionStats,
}: {
  sessionStats: { longestStreakDays: number; longestStreakRange: { start: string; end: string } | null };
}) {
  return (
    <Card title="Longest Streak">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold">
            {sessionStats.longestStreakDays} day{sessionStats.longestStreakDays === 1 ? "" : "s"}
          </p>
          {sessionStats.longestStreakRange ? (
            <p className="text-xs text-muted-foreground">
              {sessionStats.longestStreakRange.start} – {sessionStats.longestStreakRange.end}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
