"use client";

import {
  Bug,
  FolderHeart,
  Lightbulb,
  MessageSquareText,
  TicketCheck,
  Users,
} from "lucide-react";
import { useBetaStats } from "@/lib/queries";
import { Stat } from "@/components/ui/stat";
import { Loading } from "@/components/ui/loading";
import { Card } from "@/components/ui/card";

// Intentionally lightweight per spec — counts and small top-5 lists, no
// charts/real-time/advanced analytics.
export function BetaDashboardView() {
  const { data: stats, isLoading } = useBetaStats();

  if (isLoading) return <Loading label="Loading dashboard…" />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Registered testers"
          tint="blue"
          value={`${stats.totalUsers}/${stats.maxBetaUsers}`}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Remaining slots"
          tint="emerald"
          value={stats.remainingSlots}
        />
        <Stat
          icon={<FolderHeart className="h-4 w-4" />}
          label="Total books"
          tint="violet"
          value={stats.totalBooks}
        />
        <Stat
          icon={<FolderHeart className="h-4 w-4" />}
          label="Books this week"
          tint="teal"
          value={stats.booksThisWeek}
        />
        <Stat
          icon={<MessageSquareText className="h-4 w-4" />}
          label="Total feedback"
          tint="amber"
          value={stats.totalFeedback}
        />
        <Stat
          icon={<TicketCheck className="h-4 w-4" />}
          label="Open items"
          tint="rose"
          value={stats.feedbackByStatus.OPEN ?? 0}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Bug className="h-4 w-4" />}
          label="Bug reports"
          tint="rose"
          value={stats.bugReports}
        />
        <Stat
          icon={<Lightbulb className="h-4 w-4" />}
          label="Feature requests"
          tint="amber"
          value={stats.featureRequests}
        />
        <Stat
          icon={<MessageSquareText className="h-4 w-4" />}
          label="General feedback"
          tint="blue"
          value={stats.generalFeedback}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Most requested features">
          {stats.mostRequestedFeatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No feature requests yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.mostRequestedFeatures.map((f, i) => (
                <li
                  key={f.subject}
                  className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                >
                  <span className="w-5 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{f.subject}</span>
                  <span className="text-muted-foreground">{f.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Most common bugs">
          {stats.mostCommonBugs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bug reports yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.mostCommonBugs.map((b, i) => (
                <li
                  key={b.subject}
                  className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
                >
                  <span className="w-5 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1">{b.subject}</span>
                  <span className="text-muted-foreground">{b.count}×</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
