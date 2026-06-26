"use client";

import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyFeedback } from "@/lib/queries";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_STYLES,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/constants";
import type { FeedbackStatus, FeedbackType } from "@/lib/constants";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Read-only — users cannot edit feedback after submission, per spec.
export function MyFeedbackView() {
  const { data: items, isLoading } = useMyFeedback();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <MessageSquareText className="h-9 w-9 text-muted-foreground/40" />
        <div>
          <p className="font-medium">No feedback yet</p>
          <p className="text-sm text-muted-foreground">
            Spotted a bug or have an idea? Send it from the Feedback page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 rounded-2xl border bg-card p-1">
      {items.map((f) => (
        <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
              {f.subject}
            </p>
            <p className="text-xs text-muted-foreground">
              {FEEDBACK_TYPE_LABELS[f.type as FeedbackType]} ·{" "}
              {formatDate(f.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              FEEDBACK_STATUS_STYLES[f.status as FeedbackStatus],
            )}
          >
            {FEEDBACK_STATUS_LABELS[f.status as FeedbackStatus]}
          </span>
        </div>
      ))}
    </div>
  );
}
