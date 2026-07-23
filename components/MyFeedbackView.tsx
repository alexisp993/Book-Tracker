"use client";

import { MessageSquareText } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { ListContainer } from "@/components/ui/list";
import { Loading } from "@/components/ui/loading";
import { useMyFeedback } from "@/lib/queries";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_STYLES,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/constants";
import type { FeedbackStatus, FeedbackType } from "@/lib/constants";

// Read-only — users cannot edit feedback after submission, per spec.
export function MyFeedbackView() {
  const { data: items, isLoading } = useMyFeedback();

  if (isLoading) {
    return <Loading />;
  }
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No feedback yet"
        description="Spotted a bug or have an idea? Send it from the Feedback page."
      />
    );
  }

  return (
    <ListContainer inset>
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
    </ListContainer>
  );
}
