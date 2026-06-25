"use client";

import * as React from "react";
import { BookOpen, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ApiRequestError, getActiveSession, listBooks, startSession, stopSession } from "@/lib/api";
import { MOOD_EMOJI, MOOD_LABELS, READING_MOODS, STATUS_LABELS } from "@/lib/constants";
import type { ReadingMood } from "@/lib/constants";
import type { LibraryBook, ReadingSessionDTO } from "@/lib/types";

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
export function ReadingTimer() {
  const [active, setActive] = React.useState<ReadingSessionDTO | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [books, setBooks] = React.useState<LibraryBook[]>([]);
  const [starting, setStarting] = React.useState(false);

  const [stopOpen, setStopOpen] = React.useState(false);
  const [endPage, setEndPage] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [note, setNote] = React.useState("");
  const [stopping, setStopping] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getActiveSession()
      .then(setActive)
      .finally(() => setLoaded(true));
  }, []);

  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Order: Currently Reading first, then On Hold, then Want to Read — starting a
  // session on a not-yet-started book promotes it to Currently Reading automatically
  // (see lib/sessions.ts startSession), so any unfinished book is a valid pick here.
  const STATUS_ORDER = ["CURRENTLY_READING", "ON_HOLD", "WANT_TO_READ"] as const;

  async function openPicker() {
    setError(null);
    setPickerOpen(true);
    const results = await Promise.all(
      STATUS_ORDER.map((status) =>
        listBooks({ status, pageSize: 50, sort: "createdAt", order: "desc" }),
      ),
    );
    setBooks(results.flatMap((r) => r.items));
  }

  async function handleStart(userBookId: string) {
    setStarting(true);
    setError(null);
    try {
      const session = await startSession(userBookId);
      setActive(session);
      setNow(Date.now());
      setPickerOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't start the timer.",
      );
    } finally {
      setStarting(false);
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
    setStopping(true);
    setError(null);
    try {
      await stopSession({
        endPage: endPage ? Number(endPage) : undefined,
        mood: (mood as ReadingMood) || undefined,
        note: note.trim() || undefined,
      });
      setActive(null);
      setStopOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't stop the timer.",
      );
    } finally {
      setStopping(false);
    }
  }

  if (!loaded) return null;

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
          onClick={openPicker}
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
