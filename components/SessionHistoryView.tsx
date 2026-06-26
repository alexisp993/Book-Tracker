"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { SessionForm } from "@/components/SessionForm";
import { EmptyState } from "@/components/EmptyState";
import { SessionSummaryStats } from "@/components/SessionSummaryStats";
import { ReadingCalendar } from "@/components/ReadingCalendar";
import { MoodBreakdown } from "@/components/MoodBreakdown";
import { ApiRequestError } from "@/lib/api";
import {
  useCreateSession,
  useDeleteSession,
  useSessions,
  useUpdateSession,
} from "@/lib/queries";
import { MOOD_EMOJI, MOOD_LABELS, READING_MOODS } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";
import type { ReadingSessionDTO } from "@/lib/types";
import type { CreateSessionInput } from "@/lib/validation";

export function SessionHistoryView() {
  const [mood, setMood] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReadingSessionDTO | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => setPage(1), [mood, dateFrom, dateTo]);

  const { data, isLoading: loading, isError, error, refetch } = useSessions({
    mood: mood || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
  });
  const listError = isError
    ? error instanceof Error
      ? error.message
      : "Failed to load your sessions."
    : null;

  const createMutation = useCreateSession();
  const updateMutation = useUpdateSession();
  const deleteMutation = useDeleteSession();

  function openAdd() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }
  function openEdit(s: ReadingSessionDTO) {
    setEditing(s);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(values: CreateSessionInput) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteMutation.mutateAsync(editing.id);
    setFormOpen(false);
    setEditing(null);
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const isEmpty = !loading && items.length === 0;
  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <SessionSummaryStats />
      <ReadingCalendar />
      <MoodBreakdown />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {loading && !data
            ? "Loading…"
            : `${data?.total ?? 0} session${data?.total === 1 ? "" : "s"} logged`}
        </p>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Log session
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          className="sm:w-44"
          aria-label="Filter by mood"
        >
          <option value="">All moods</option>
          {READING_MOODS.map((m) => (
            <option key={m} value={m}>
              {MOOD_EMOJI[m]} {MOOD_LABELS[m]}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          className="sm:w-40"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          className="sm:w-40"
        />
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError}{" "}
          <button onClick={() => refetch()} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={NotebookPen}
          title="No sessions yet"
          description="Use the timer or log one manually to start tracking your reading."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Log session
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openEdit(s)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary"
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                {s.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-display text-[15px] font-semibold leading-tight">
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  📖 {formatDuration(s.minutes)}
                  {s.pagesRead ? ` · ${s.pagesRead} pages` : ""}
                  {s.mood ? ` · ${MOOD_EMOJI[s.mood]} ${MOOD_LABELS[s.mood]}` : ""}
                </p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground/80">
                  {formatDate(s.date)}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
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
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit session" : "Log a reading session"}
      >
        <SessionForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
          onDelete={editing ? handleDelete : undefined}
        />
      </Dialog>
    </div>
  );
}
