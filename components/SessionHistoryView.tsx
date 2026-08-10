"use client";

import * as React from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { SessionForm } from "@/components/SessionForm";
import { EmptyState } from "@/components/EmptyState";
import { Band } from "@/components/ui/section";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { SessionSummaryStats } from "@/components/SessionSummaryStats";
import { ReadingHeatmap } from "@/components/ReadingHeatmap";
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
      <Band label="Reading calendar">
        <ReadingHeatmap showCard={false} />
      </Band>
      <MoodBreakdown />

      <Band
        label={
          loading && !data
            ? "History"
            : `History · ${data?.total ?? 0} session${data?.total === 1 ? "" : "s"} logged`
        }
        actions={
          // Outline: the global "Start reading" FAB is already the one filled
          // affordance in this viewport, and logging a past session is the
          // secondary path.
          <Button variant="outline" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Log session
          </Button>
        }
      >
        <div className="space-y-4">
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
        // Authored, matching the voice Home and Shelves already use.
        <div className="max-w-md py-4">
          <p className="font-display text-2xl leading-snug">
            No sessions logged yet.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Start the timer when you sit down to read, or add a past session by
            hand. Either way it lands here, with the mood and whatever you
            wanted to remember about it.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 border-b border-primary/40 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" /> Log a session
          </button>
        </div>
      ) : (
        // A grid, not one long column. The page spans the full shell and a
        // single stack of rows left most of it empty.
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openEdit(s)}
              className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left hover:bg-secondary shadow-card transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:shadow-card-hover"
            >
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                {/* Guarded like every other cover in the app — this was the
                    last raw one left, and it had no onError at all, so a dead
                    URL rendered as a broken-image glyph. */}
                {s.coverUrl ? (
                  <FallbackCoverImg candidates={[s.coverUrl]} alt="" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-display text-title-sm font-semibold leading-tight">
                  {s.title}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
                  {formatDuration(s.minutes)}
                  {s.pagesRead ? ` · ${s.pagesRead} pages` : ""}
                  {s.mood ? ` · ${MOOD_EMOJI[s.mood]} ${MOOD_LABELS[s.mood]}` : ""}
                </p>
                <p className="line-clamp-1 text-caption-sm text-muted-foreground/80">
                  {formatDate(s.date)}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          disabled={loading}
        />
        </div>
      </Band>

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
