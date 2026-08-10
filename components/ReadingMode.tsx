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
import { ProgressBar } from "@/components/ui/bar";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { FinishedMoment } from "@/components/FinishedMoment";
import { ApiRequestError } from "@/lib/api";
import { useBook, useDeleteSession, useStopSession } from "@/lib/queries";
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

// ---------------------------------------------------------------------------
// Optional target duration ("set a timer" when starting a session) — a
// purely client-side reading aid, not sent to or stored by the server: it
// doesn't change what a session records, only whether Reading Mode shows a
// secondary "X min left" progress line alongside the real elapsed clock.
// Same localStorage-per-session-id pattern as pause state, for the same
// reason (survives a refresh mid-session).
// ---------------------------------------------------------------------------

const targetKey = (sessionId: string) => `bt_target:${sessionId}`;

export function readTargetMinutes(sessionId: string): number | null {
  try {
    const raw = localStorage.getItem(targetKey(sessionId));
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // corrupted/unavailable storage — treat as no target set
  }
  return null;
}

export function writeTargetMinutes(sessionId: string, minutes: number) {
  try {
    localStorage.setItem(targetKey(sessionId), String(minutes));
  } catch {
    // best-effort
  }
}

export function clearTargetMinutes(sessionId: string) {
  try {
    localStorage.removeItem(targetKey(sessionId));
  } catch {
    // best-effort
  }
}

// The optimistic session (see ReadingTimer.tsx) is written under a
// placeholder id before the real one exists; once the real id lands, carry
// the target duration over to it rather than losing it.
export function migrateTargetMinutes(fromId: string, toId: string) {
  const minutes = readTargetMinutes(fromId);
  if (minutes === null) return;
  clearTargetMinutes(fromId);
  writeTargetMinutes(toId, minutes);
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
  const [targetMinutes, setTargetMinutes] = React.useState<number | null>(() =>
    readTargetMinutes(session.id),
  );
  const [view, setView] = React.useState<
    "timer" | "finish" | "saved" | "finished"
  >("timer");
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const [endPage, setEndPage] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [savedSummary, setSavedSummary] = React.useState<{
    minutes: number;
    endPage: number | null;
  } | null>(null);

  const stopMutation = useStopSession();
  const deleteMutation = useDeleteSession();

  // Only fetched once the reader has actually reached the finished view —
  // useBook is gated on a truthy id, so an empty string is a no-op query and
  // every ordinary session avoids the request entirely.
  const { data: finishedBook } = useBook(
    view === "finished" ? session.userBookId : "",
  );

  const paused = pause.pausedSince !== null;

  // Re-sync pause state and target duration when the session changes (new
  // session id — this also fires the moment ReadingTimer's optimistic
  // placeholder id is swapped for the real one, which is what actually
  // surfaces a target duration set at the picker: it was written under the
  // real id at that point, see ReadingTimer.tsx).
  React.useEffect(() => {
    setPause(readPauseState(session.id));
    setTargetMinutes(readTargetMinutes(session.id));
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

  // Auto-dismiss the confirmation after a beat long enough to register but
  // short enough that it never reads as a forced wait on a routine action —
  // a click or keypress (below) can always cut it short.
  React.useEffect(() => {
    if (view !== "saved") return;
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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
      clearTargetMinutes(session.id);
      // Finishing a session is the core loop's one completion event — it
      // used to close with zero acknowledgment. Hold on a brief confirmation
      // instead of closing immediately; the effect below auto-dismisses it.
      const end = endPage ? Number(endPage) : null;
      setSavedSummary({ minutes, endPage: end });

      // Reading to the last page is the end of the *book*, not just the
      // session, and until now the app said "Session saved" and closed —
      // leaving the book Currently Reading forever.
      //
      // Offered, never assumed: provider page counts are wrong often enough
      // that silently marking the book read would be worse than saying
      // nothing. The finished view carries an explicit "still reading" way
      // out, which drops back to this same confirmation.
      const readToTheEnd =
        end !== null && !!session.pageCount && end >= session.pageCount;
      setView(readToTheEnd ? "finished" : "saved");
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
      clearTargetMinutes(session.id);
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

  // The finished view replaces the whole overlay rather than nesting inside
  // it — it's about the book, not the session, so none of the session chrome
  // (minimize, "Reading session" label) belongs around it. The book is only
  // fetched once we're actually showing it; useBook is gated on a truthy id.
  if (view === "finished" && finishedBook) {
    return (
      <FinishedMoment
        book={finishedBook}
        onClose={onClose}
        onNotYet={() => setView("saved")}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
      role="dialog"
      aria-modal="true"
      aria-label="Reading session"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {view === "saved" ? (
          <div className="w-9" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Minimize reading mode"
            title="Minimize (session keeps running)"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {view === "saved" ? "" : "Reading session"}
        </p>
        <div className="w-9" />
      </div>

      {view === "saved" && savedSummary ? (
        <div
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 px-6 pb-10"
          onClick={onClose}
          role="button"
          tabIndex={0}
          aria-label="Session saved. Dismiss."
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClose();
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
            <circle
              cx="40"
              cy="40"
              r="30"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="188.5"
              className="animate-[bt-check-circle_550ms_ease-out_forwards]"
              style={{ strokeDashoffset: 188.5 }}
            />
            <path
              d="M25 41 L35 51 L56 28"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="46"
              className="animate-[bt-check-mark_350ms_ease-out_250ms_forwards]"
              style={{ strokeDashoffset: 46 }}
            />
          </svg>
          <div className="animate-[bt-rise-in_250ms_ease-out_300ms_both] text-center">
            <p className="font-display text-lg font-semibold">Session saved</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {clockLabel(savedSummary.minutes * 60000)} logged
              {savedSummary.endPage ? ` · up to page ${savedSummary.endPage}` : ""}
            </p>
          </div>
        </div>
      ) : view === "timer" ? (
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

            {/* Optional target duration set at the picker — a secondary aid,
                never the source of truth for the recorded session length
                (that's always the elapsed clock above). No auto-stop: once
                reached this just says so calmly and keeps counting. */}
            {targetMinutes ? (
              <div className="mt-1 w-48">
                <ProgressBar
                  value={elapsed}
                  max={targetMinutes * 60_000}
                  fillClass={
                    elapsed >= targetMinutes * 60_000 ? "bg-primary" : "bg-primary/70"
                  }
                />
                <p className="mt-1.5 text-center text-xs text-muted-foreground">
                  {elapsed >= targetMinutes * 60_000
                    ? "Timer's up — keep going or finish whenever you're ready"
                    : `${Math.ceil((targetMinutes * 60_000 - elapsed) / 60_000)} min left of ${targetMinutes}`}
                </p>
              </div>
            ) : null}
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
                <Check className="h-5 w-5" /> Finish Session
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
                  // While the session is still the client-side optimistic
                  // placeholder (see ReadingTimer.tsx), it has no real id yet
                  // — deleteSession(id) needs one, unlike stop/finish, which
                  // targets "whichever session is active" server-side with
                  // no id at all. A few seconds' wait here is honest; a 404
                  // from discarding a session that was never created isn't.
                  disabled={deleteMutation.isPending || session.id === "optimistic"}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  {deleteMutation.isPending
                    ? "Discarding…"
                    : session.id === "optimistic"
                      ? "Starting…"
                      : "Yes, discard"}
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
