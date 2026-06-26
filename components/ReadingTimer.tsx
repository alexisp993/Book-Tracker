"use client";

import * as React from "react";
import { BookOpen, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ApiRequestError } from "@/lib/api";
import {
  useActiveSession,
  useBooks,
  useStartSession,
  useStopSession,
} from "@/lib/queries";
import { MOOD_EMOJI, MOOD_LABELS, READING_MOODS, STATUS_LABELS } from "@/lib/constants";
import type { ReadingMood } from "@/lib/constants";

function elapsedLabel(startIso: string, nowMs: number): string {
  const start = new Date(startIso).getTime();
  const totalSec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Floating reading-timer widget, mounted once in AppShell so it survives
// route navigation (a timer shouldn't reset just because the user switches tabs).
//
// IMPORTANT: the 1-second elapsed-time tick below is plain local state
// (`now`) re-rendering a clock from data already in memory — it must NOT
// become a query refetch loop. Only "is a session active" is a query
// (`useActiveSession`, staleTime 0), fetched once and on mutation
// invalidation; the ticking clock stays local, exactly as before.
export function ReadingTimer() {
  const { data: active, isLoading: loadingActive } = useActiveSession();
  const [now, setNow] = React.useState(Date.now());

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [stopOpen, setStopOpen] = React.useState(false);
  const [endPage, setEndPage] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const startMutation = useStartSession();
  const stopMutation = useStopSession();

  // Each status is its own query (cacheable and shared with LibraryView when
  // filters match) — three explicit calls, not a `.map()` over a status list,
  // because hooks can't be called in a loop/array-map (Rules of Hooks). Order:
  // Currently Reading first, then On Hold, then Want to Read — starting a
  // session on a not-yet-started book promotes it to Currently Reading
  // automatically (see lib/sessions.ts startSession), so any unfinished book
  // is a valid pick here.
  //
  // Deliberately NOT gated by `enabled: pickerOpen`: toggling a query's
  // `enabled` flag off then back on makes TanStack Query treat re-enabling
  // like a fresh mount and refetch immediately, even with data still well
  // within staleTime — confirmed via testing (the picker re-fetched on every
  // reopen despite a 20s staleTime). ReadingTimer is a persistent global
  // widget (mounted once in AppShell for the app's lifetime) anyway, so
  // there's no real cost to letting these run as ordinary always-enabled
  // queries — staleTime alone then governs refetch frequency, and reopening
  // the picker within that window genuinely serves from cache.
  const baseParams = { pageSize: 50, sort: "createdAt", order: "desc" } as const;
  const currentlyReading = useBooks({ ...baseParams, status: "CURRENTLY_READING" });
  const onHold = useBooks({ ...baseParams, status: "ON_HOLD" });
  const wantToRead = useBooks({ ...baseParams, status: "WANT_TO_READ" });
  const books = [
    ...(currentlyReading.data?.items ?? []),
    ...(onHold.data?.items ?? []),
    ...(wantToRead.data?.items ?? []),
  ];

  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  async function handleStart(userBookId: string) {
    setError(null);
    try {
      await startMutation.mutateAsync(userBookId);
      setNow(Date.now());
      setPickerOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't start the timer.",
      );
    }
  }

  function openStop() {
    setEndPage("");
    setMood("");
    setNote("");
    setError(null);
    setStopOpen(true);
  }

  async function handleStop(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await stopMutation.mutateAsync({
        endPage: endPage ? Number(endPage) : undefined,
        mood: (mood as ReadingMood) || undefined,
        note: note.trim() || undefined,
      });
      setStopOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't stop the timer.",
      );
    }
  }

  if (loadingActive) return null;

  const starting = startMutation.isPending;
  const stopping = stopMutation.isPending;

  return (
    <>
      {active ? (
        <button
          type="button"
          onClick={openStop}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-background shadow-lg transition-transform hover:scale-105 sm:bottom-6"
        >
          <Pause className="h-4 w-4" />
          <span className="line-clamp-1 max-w-[140px] text-sm font-medium">
            {active.title}
          </span>
          <span className="font-mono text-sm tabular-nums">
            {elapsedLabel(active.date, now)}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:bottom-6"
        >
          <Play className="h-4 w-4" />
          <span className="text-sm font-medium">Start reading</span>
        </button>
      )}

      <Dialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Start a reading session"
        description="Pick the book you're about to read."
      >
        <div className="space-y-2">
          {books.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <BookOpen className="h-7 w-7 opacity-40" />
              <p>Add a book to your library first.</p>
              <p className="text-xs">
                Finished books won&rsquo;t show here — add a new one or check your
                shelves.
              </p>
            </div>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={starting}
                  onClick={() => handleStart(b.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary disabled:opacity-50"
                >
                  <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {b.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{b.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {STATUS_LABELS[b.status]} · Page {b.currentPage}
                      {b.pageCount ? ` of ${b.pageCount}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        title="Finish session"
        description={active ? `${active.title} · ${elapsedLabel(active.date, now)}` : undefined}
      >
        <form onSubmit={handleStop} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="end-page">Page you reached</Label>
            <Input
              id="end-page"
              type="number"
              min={0}
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              placeholder="e.g. 124"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-mood">How did it feel?</Label>
            <Select
              id="session-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="">Skip</option>
              {READING_MOODS.map((m) => (
                <option key={m} value={m}>
                  {MOOD_EMOJI[m]} {MOOD_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-note">Notes / thoughts (optional)</Label>
            <Textarea
              id="session-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStopOpen(false)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={stopping}>
              {stopping ? "Saving…" : "Save session"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
