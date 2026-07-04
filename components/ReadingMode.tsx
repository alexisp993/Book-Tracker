"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  Pause,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { ApiRequestError } from "@/lib/api";
import { useDeleteSession, useStopSession } from "@/lib/queries";
import { MOOD_EMOJI, MOOD_LABELS, READING_MOODS } from "@/lib/constants";
import type { ReadingMood } from "@/lib/constants";
import type { ReadingSessionDTO } from "@/lib/types";

// ---------------------------------------------------------------------------
// Pause bookkeeping (client-side; the session model has no pause concept).
//
// Persisted per session in localStorage so a refresh or tab switch doesn't
// lose paused time. On finish we report active minutes = wall clock minus
// paused time; the server clamps this to the wall clock so it can only
// reduce the recorded duration, never inflate it.
// ---------------------------------------------------------------------------

interface PauseState {
  pausedTotalMs: number;
  pausedSince: number | null; // ms epoch while paused, null while running
}

const pauseKey = (sessionId: string) => `bt_pause:${sessionId}`;

function readPauseState(sessionId: string): PauseState {
  try {
    const raw = localStorage.getItem(pauseKey(sessionId));
    if (raw) {
      const parsed = JSON.parse(raw) as PauseState;
      if (typeof parsed.pausedTotalMs === "number") return parsed;
    }
  } catch {
    // corrupted/unavailable storage — treat as never paused
  }
  return { pausedTotalMs: 0, pausedSince: null };
}

function writePauseState(sessionId: string, state: PauseState) {
  try {
    localStorage.setItem(pauseKey(sessionId), JSON.stringify(state));
  } catch {
    // best-effort
  }
}

export function clearPauseState(sessionId: string) {
  try {
    localStorage.removeItem(pauseKey(sessionId));
  } catch {
    // best-effort
  }
}

/**
 * Active elapsed time for a session (wall clock minus recorded pauses) —
 * used by the collapsed pill so it matches the reading-mode clock.
 */
export function getActiveElapsedMs(
  sessionId: string,
  startIso: string,
  nowMs: number,
): { elapsedMs: number; paused: boolean } {
  const pause = readPauseState(sessionId);
  return {
    elapsedMs: activeMs(startIso, pause, pause.pausedSince ?? nowMs),
    paused: pause.pausedSince !== null,
  };
}

// Any component (e.g. a book page CTA) can ask the globally mounted timer
// widget to expand into reading mode via this event.
export const READING_MODE_OPEN_EVENT = "bt:reading-mode:open";

export function requestReadingModeOpen() {
  window.dispatchEvent(new CustomEvent(READING_MODE_OPEN_EVENT));
}

/** Active reading milliseconds: wall clock minus paused time. */
function activeMs(startIso: string, pause: PauseState, nowMs: number): number {
  const start = new Date(startIso).getTime();
  const pausedLive = pause.pausedSince ? nowMs - pause.pausedSince : 0;
  return Math.max(0, nowMs - start - pause.pausedTotalMs - pausedLive);
}

function clockLabel(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ---------------------------------------------------------------------------
// Full-screen immersive reading mode. Opened from the floating timer pill or
// a book page's "Start reading session" CTA; closing it collapses back to
// the pill without touching the running session.
// ---------------------------------------------------------------------------

export function ReadingMode({
  session,
  open,
  onClose,
}: {
  session: ReadingSessionDTO;
  open: boolean;
  onClose: () => void;
}) {
  const [now, setNow] = React.useState(Date.now());
  const [pause, setPause] = React.useState<PauseState>(() =>
    readPauseState(session.id),
  );
  const [view, setView] = React.useState<"timer" | "finish">("timer");
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [endPage, setEndPage] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const stopMutation = useStopSession();
  const deleteMutation = useDeleteSession();

  const paused = pause.pausedSince !== null;

  // Re-sync pause state when the session changes (new session id).
  React.useEffect(() => {
    setPause(readPauseState(session.id));
    setView("timer");
    setConfirmCancel(false);
    setError(null);
  }, [session.id]);

  // 1-second local tick while visible and running — renders a clock from
  // in-memory data only, never refetches (same rule as ReadingTimer).
  React.useEffect(() => {
    if (!open || paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, paused]);

  // Lock body scroll while the overlay is up.
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const elapsed = activeMs(session.date, pause, paused ? pause.pausedSince! : now);

  function togglePause() {
    setError(null);
    setPause((prev) => {
      const next: PauseState = prev.pausedSince
        ? {
            pausedTotalMs: prev.pausedTotalMs + (Date.now() - prev.pausedSince),
            pausedSince: null,
          }
        : { ...prev, pausedSince: Date.now() };
      writePauseState(session.id, next);
      return next;
    });
    setNow(Date.now());
  }

  function openFinish() {
    // Pause the clock while filling the finish form so thinking time
    // doesn't count as reading time.
    if (!paused) togglePause();
    setEndPage(session.currentPage ? String(session.currentPage) : "");
    setMood("");
    setNote("");
    setError(null);
    setView("finish");
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const minutes = Math.max(1, Math.round(elapsed / 60000));
    try {
      await stopMutation.mutateAsync({
        endPage: endPage ? Number(endPage) : undefined,
        mood: (mood as ReadingMood) || undefined,
        note: note.trim() || undefined,
        minutes,
      });
      clearPauseState(session.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't save the session.",
      );
    }
  }

  async function handleCancel() {
    setError(null);
    try {
      await deleteMutation.mutateAsync(session.id);
      clearPauseState(session.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Couldn't discard the session.",
      );
    }
  }

  const progressLabel = session.pageCount
    ? `Page ${session.currentPage} of ${session.pageCount}`
    : `Page ${session.currentPage}`;
  const startedLabel = new Date(session.date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      role="dialog"
      aria-modal="true"
      aria-label="Reading session"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Minimize reading mode"
          title="Minimize (session keeps running)"
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Reading session
        </p>
        <div className="w-9" />
      </div>

      {view === "timer" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-10">
          {/* Book identity */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-40 w-28 overflow-hidden rounded-xl border bg-muted shadow-md sm:h-48 sm:w-32">
              {session.coverCandidates.length > 0 ? (
                <FallbackCoverImg
                  candidates={session.coverCandidates}
                  alt={`Cover of ${session.title}`}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="max-w-md">
              <h1 className="font-display text-xl font-semibold leading-snug sm:text-2xl">
                {session.title}
              </h1>
              {session.author ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {session.author}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {progressLabel} · Started {startedLabel}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center gap-2">
            <p
              className={[
                "font-mono text-6xl font-semibold tabular-nums tracking-tight sm:text-7xl",
                paused ? "text-muted-foreground" : "text-foreground",
              ].join(" ")}
            >
              {clockLabel(elapsed)}
            </p>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-medium",
                paused
                  ? "bg-secondary text-muted-foreground"
                  : "bg-primary/10 text-primary",
              ].join(" ")}
            >
              {paused ? "Paused" : "Reading"}
            </span>
          </div>

          {/* Controls */}
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={togglePause}
                className="h-14 w-14 rounded-full p-0"
                aria-label={paused ? "Resume" : "Pause"}
                title={paused ? "Resume" : "Pause"}
              >
                {paused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </Button>
              <Button
                type="button"
                onClick={openFinish}
                className="h-14 rounded-full px-8 text-base"
              >
                <Check className="h-5 w-5" /> Finish
              </Button>
            </div>

            {confirmCancel ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Discard this session?</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={deleteMutation.isPending}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {deleteMutation.isPending ? "Discarding…" : "Yes, discard"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep reading
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Cancel session
              </button>
            )}

            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        /* Finish view */
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
          <form onSubmit={handleFinish} className="w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="font-mono text-4xl font-semibold tabular-nums">
                {clockLabel(elapsed)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.title}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-end-page">Page you reached</Label>
              <Input
                id="rm-end-page"
                type="number"
                min={0}
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                placeholder="e.g. 124"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rm-mood">How did it feel?</Label>
              <Select
                id="rm-mood"
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
              <Label htmlFor="rm-note">Notes / thoughts (optional)</Label>
              <Textarea
                id="rm-note"
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
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView("timer")}
              >
                <X className="h-4 w-4" /> Back
              </Button>
              <Button type="submit" disabled={stopMutation.isPending}>
                {stopMutation.isPending ? "Saving…" : "Save session"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
