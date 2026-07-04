"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageSquareText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { useAdminFeedbackList } from "@/lib/queries";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_STYLES,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/constants";
import type { FeedbackStatus, FeedbackType } from "@/lib/constants";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function AdminFeedbackView() {
  const [type, setType] = React.useState("");
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => setPage(1), [type, debouncedQ]);

  const { data, isLoading } = useAdminFeedbackList({
    type: type || undefined,
    q: debouncedQ || undefined,
    page,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user, subject, description…"
            className="pl-9"
            aria-label="Search feedback"
          />
        </div>
        <Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="sm:w-48"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {FEEDBACK_TYPES.map((t) => (
            <option key={t} value={t}>
              {FEEDBACK_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No feedback matches"
          description="Try a different search or clear the type filter."
        />
      ) : (
        <div className="divide-y divide-border/60 rounded-2xl border bg-card p-1">
          {items.map((f) => (
            <Link
              key={f.id}
              href={`/admin/feedback/${f.id}`}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
                  {f.subject}
                </p>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {f.user.name ?? f.user.email} ·{" "}
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
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
