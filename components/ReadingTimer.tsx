"use client";

import * as React from "react";
import { BookOpen, Play } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import {
  useActiveSession,
  useBooks,
  useStartSession,
} from "@/lib/queries";
import { STATUS_LABELS } from "@/lib/constants";
import {
  READING_MODE_OPEN_EVENT,
  ReadingMode,
  getActiveElapsedMs,
} from "@/components/ReadingMode";

function clockLabel(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Floating reading-timer widget, mounted once in AppShell so it survives
// route navigation (a timer shouldn't reset just because the user switches
// tabs). The pill is only an entry point / collapsed indicator — the actual
// session UI is the full-screen ReadingMode overlay.
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
  const [modeOpen, setModeOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const startMutation = useStartSession();

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

  // A book page's "Start reading session" CTA (or any other launcher) can
  // request the full-screen mode; if the session hasn't landed in the cache
  // yet the flag stays set and the mode opens as soon as it does.
  const [wantOpen, setWantOpen] = React.useState(false);
  React.useEffect(() => {
    const onOpen = () => setWantOpen(true);
    window.addEventListener(READING_MODE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(READING_MODE_OPEN_EVENT, onOpen);
  }, []);
  React.useEffect(() => {
    if (wantOpen && active) {
      setModeOpen(true);
      setWantOpen(false);
    }
  }, [wantOpen, active]);

  async function handleStart(userBookId: string) {
    setError(null);
    try {
      await startMutation.mutateAsync(userBookId);
      setNow(Date.now());
      setPickerOpen(false);
      setModeOpen(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Couldn't start the timer.",
      );
    }
  }

  if (loadingActive) return null;

  const starting = startMutation.isPending;
  const activeClock = active
    ? getActiveElapsedMs(active.id, active.date, now)
    : null;

  return (
    <>
      {active ? (
        <button
          type="button"
          onClick={() => setModeOpen(true)}
          title="Open reading mode"
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-background shadow-lg transition-transform hover:scale-105 sm:bottom-6"
        >
          {activeClock?.paused ? (
            <Play className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          <span className="line-clamp-1 max-w-[140px] text-sm font-medium">
            {active.title}
          </span>
          <span className="font-mono text-sm tabular-nums">
            {activeClock?.paused ? "Paused" : clockLabel(activeClock?.elapsedMs ?? 0)}
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

      {active ? (
        <ReadingMode
          session={active}
          open={modeOpen}
          onClose={() => setModeOpen(false)}
        />
      ) : null}
    </>
  );
}
