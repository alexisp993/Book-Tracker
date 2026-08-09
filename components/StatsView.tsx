"use client";

import type * as React from "react";
import { useState } from "react";
import NumberFlow from "@number-flow/react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  BookCheck,
  BookOpen,
  Clock,
  Flame,
  Heart,
  LayoutGrid,
  Library,
  Sparkles,
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
  { value: "overview", label: "Overview", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: "books", label: "Books", icon: <Library className="h-3.5 w-3.5" /> },
  { value: "sessions", label: "Sessions", icon: <Timer className="h-3.5 w-3.5" /> },
  { value: "time", label: "Time", icon: <Clock className="h-3.5 w-3.5" /> },
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
          <Loading label="Loading your stats…" />
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

  const maxStatus = Math.max(1, ...stats.byStatus.map((s) => s.count));
  const maxRating = Math.max(1, ...stats.ratingDistribution.map((r) => r.count));
  const maxGenre = Math.max(1, ...stats.genreBreakdown.map((g) => g.count));

  const totalMinutesThisYear = stats.minutesPerMonth.reduce((sum, m) => sum + m.minutes, 0);
  const totalBooksThisYear = stats.booksPerMonth.reduce((sum, m) => sum + m.count, 0);
  const totalPagesThisYear = stats.pagesPerMonth.reduce((sum, m) => sum + m.pages, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Statistics" subtitle="Your reading, at a glance" />

      <SegmentedTabs value={tab} onChange={setTab} items={TABS} />

      {tab === "overview" ? (
        <div className="space-y-6">
          <YearHeroCard stats={stats} streakDays={sessionStats?.streakDays ?? 0} />

          <div>
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              All-time totals
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
              <Stat icon={<BookOpen className="h-4 w-4" />} label="Total" tint="blue" value={<NumberFlow value={stats.total} />} />
              <Stat icon={<BookCheck className="h-4 w-4" />} label="Read" tint="emerald" value={<NumberFlow value={stats.read} />} />
              <Stat icon={<Flame className="h-4 w-4" />} label="Reading" tint="amber" value={<NumberFlow value={stats.reading} />} />
              <Stat
                icon={<BookOpen className="h-4 w-4" />}
                label="Pages read"
                tint="violet"
                value={<NumberFlow value={stats.pagesRead} />}
              />
              <Stat icon={<Heart className="h-4 w-4" />} label="Favorites" tint="rose" value={<NumberFlow value={stats.favorites} />} />
              <Stat
                icon={<Star className="h-4 w-4" />}
                label="Avg rating"
                tint="amber"
                value={
                  stats.avgRating ? (
                    <NumberFlow
                      value={stats.avgRating}
                      format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </div>

          <TimeReadChart
            minutesPerMonth={stats.minutesPerMonth}
            totalMinutes={totalMinutesThisYear}
            yoyPct={stats.timeReadYoyPct}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Sparkline
              title="Books Read"
              value={totalBooksThisYear}
              yoyPct={stats.booksYoyPct}
              points={stats.booksPerMonth.map((m) => m.count)}
              tint="emerald"
            />
            <Sparkline
              title="Pages Read"
              value={totalPagesThisYear}
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
            <MonthlyBarChart
              data={stats.booksPerMonth.map((m) => ({ key: m.month, label: m.label, value: m.count }))}
              formatValue={(v) => `${v} book${v === 1 ? "" : "s"}`}
            />
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

// The page's opening statement — "this year" is the number a reader actually
// cares to check in on, so it leads, big and first. The 6-tile grid below
// still carries the honest all-time totals, just demoted to secondary.
function YearHeroCard({
  stats,
  streakDays,
}: {
  stats: {
    booksThisYear: number;
    pagesThisYear: number;
    minutesThisYear: number;
    booksYoyPct: number | null;
  };
  streakDays: number;
}) {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" /> This year in reading
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            <NumberFlow value={stats.booksThisYear} /> book{stats.booksThisYear === 1 ? "" : "s"}
          </p>
          <div className="mt-1">
            <YoyDelta pct={stats.booksYoyPct} />
          </div>
        </div>
        <div className="flex gap-5">
          <div>
            <p className="font-display text-lg font-semibold">
              <NumberFlow value={stats.pagesThisYear} />
            </p>
            <p className="text-xs text-muted-foreground">pages</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold">
              {formatDuration(stats.minutesThisYear)}
            </p>
            <p className="text-xs text-muted-foreground">time read</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold">
              {streakDays > 0 ? (
                <>
                  <NumberFlow value={streakDays} /> 🔥
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
      </div>
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

// Shared month-bucket bar chart (recharts) — used for both "Time Read" and
// "Books finished". `activeBar` lets recharts swap the fill on hover/tap
// itself, so there's no manual focus-index state or per-cell fill logic to
// keep in sync — the library owns the interaction, we only style it.
function MonthlyBarChart({
  data,
  formatValue,
}: {
  data: { key: string; label: string; value: number }[];
  formatValue: (v: number) => string;
}) {
  return (
    <div className="-ml-2 h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.6)" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md">
                  {payload[0].payload.label} / {formatValue(payload[0].value as number)}
                </div>
              ) : null
            }
          />
          <Bar
            dataKey="value"
            fill="hsl(var(--primary) / 0.4)"
            activeBar={{ fill: "hsl(var(--primary))" }}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
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
  return (
    <Card title="Time Read">
      <div className="mb-2">
        <p className="font-display text-3xl font-semibold">{formatDuration(totalMinutes)}</p>
        <YoyDelta pct={yoyPct} />
      </div>
      <MonthlyBarChart
        data={minutesPerMonth.map((m) => ({ key: m.month, label: m.label, value: m.minutes }))}
        formatValue={formatDuration}
      />
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
  value: number;
  yoyPct: number | null;
  points: number[];
  tint: "emerald" | "violet";
}) {
  const stroke = tint === "emerald" ? "rgb(16 185 129)" : "rgb(139 92 246)";
  const data = points.map((p, i) => ({ i, value: p }));

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold">
        <NumberFlow value={value} />
      </p>
      <div className="mt-1">
        <YoyDelta pct={yoyPct} />
      </div>
      <div className="mt-2 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
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
            <NumberFlow value={sessionStats.longestStreakDays} />{" "}
            day{sessionStats.longestStreakDays === 1 ? "" : "s"}
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
