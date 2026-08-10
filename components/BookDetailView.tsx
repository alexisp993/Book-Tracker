"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookCheck,
  BookOpen,
  ChevronDown,
  Heart,
  Pencil,
  Timer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Band } from "@/components/ui/section";
import { BackHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/bar";
import { Dialog } from "@/components/ui/dialog";
import { BookCover, CoverFrame } from "@/components/BookCover";
import { StatusBadge } from "@/components/StatusBadge";
import { FinishedMoment } from "@/components/FinishedMoment";
import { StarRating } from "@/components/StarRating";
import { EmptyState } from "@/components/EmptyState";
import {
  BookForm,
  type BookFormValues,
} from "@/components/BookForm";
import { ApiRequestError } from "@/lib/api";
import {
  useActiveSession,
  useBook,
  useStartSession,
  useUpdateBook,
  useSessions,
  useDeleteBook,
} from "@/lib/queries";
import { requestReadingModeOpen } from "@/components/ReadingMode";
import { NotesView } from "@/components/NotesView";
import { MOOD_EMOJI, MOOD_LABELS } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/utils";

export function BookDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: book, isLoading } = useBook(id);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const updateMutation = useUpdateBook();
  const deleteMutation = useDeleteBook();
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();

  // Unified "Update Progress" split-button menu — same local-state +
  // outside-click pattern as BookRow's kebab menu.
  const [progressMenuOpen, setProgressMenuOpen] = React.useState(false);
  const progressMenuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!progressMenuOpen) return;
    function onOutside(e: MouseEvent) {
      if (progressMenuRef.current && !progressMenuRef.current.contains(e.target as Node)) {
        setProgressMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [progressMenuOpen]);

  // Entry point only — the timer UI itself is the full-screen ReadingMode
  // overlay (mounted globally in AppShell via ReadingTimer).
  async function handleStartReading() {
    setSessionError(null);
    if (activeSession) {
      requestReadingModeOpen();
      return;
    }
    try {
      await startSession.mutateAsync(id);
      requestReadingModeOpen();
    } catch (err) {
      setSessionError(
        err instanceof ApiRequestError
          ? err.message
          : "Couldn't start the session.",
      );
    }
  }

  async function handleDelete() {
    if (!book) return;
    await deleteMutation.mutateAsync(book.id);
    setDeleteConfirmOpen(false);
    // The page is scoped to this one book, unlike Library's kebab-delete
    // (which just closes a dialog and the row disappears in place) —
    // there's nothing left here to show once it's gone.
    router.replace("/library");
  }

  async function handleSubmit(values: BookFormValues) {
    if (!book) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: book.id, input: values });
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading label="Loading book…" />
      </div>
    );
  }

  if (!book) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Book not found"
        description="This book isn't in your library."
        action={
          <Link
            href="/library"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Library
          </Link>
        }
      />
    );
  }

  const progress =
    book.pageCount && book.pageCount > 0
      ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))
      : null;

  return (
    // Book Detail is a reading surface, not a dashboard — capped so the hero
    // doesn't strand ~1000px of empty space beside the cover and the metadata
    // grid doesn't stretch six cells across the full shell.
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <BackHeader href="/library" backLabel="Back to Library" />

      {/* Unboxed hero, matching Home. This book is the subject of the page,
          not a liftable object sitting on it, so the composition is carried by
          the cover's scale and the title's size rather than a border. The
          cover moves onto the shared scale instead of a one-off width. */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-9">
        <CoverFrame size="hero" className="self-start">
          <BookCover book={book} />
        </CoverFrame>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-[2.75rem]">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
              {book.subtitle}
            </p>
          ) : null}
          <p className="mt-2 font-display text-lg italic text-muted-foreground">
            {book.authors.length > 0 ? book.authors.join(", ") : "Unknown author"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={book.status} />
            {book.favorite ? (
              <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                <Heart className="h-3.5 w-3.5 fill-rose-500" /> Favorite
              </span>
            ) : null}
            {book.rating ? <StarRating value={book.rating} size={13} /> : null}
          </div>

          {progress !== null && book.status === "CURRENTLY_READING" ? (
            // Capped like Home's hero. Unboxing widened this column, and a
            // rule running the full 1024px read as a page loading bar rather
            // than one book's progress.
            <div className="mt-3 max-w-sm">
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-muted-foreground">
                  {book.currentPage}/{book.pageCount} pages
                </p>
                <p className="text-lg font-bold leading-none">{progress}%</p>
              </div>
              <ProgressBar value={progress} className="mt-1" />
            </div>
          ) : null}

          {/* Unified "Update Progress" split button — primary opens the edit
              form; the chevron reveals reading-session, Edit, and Delete, so
              the hero has one action control instead of scattered icons.
              Edit/Delete used to only be reachable by going back to Library
              and finding this exact card's kebab — found via /impeccable
              critique, since this is the page a reader spends the most time
              on per book. */}
          <div className="relative mt-4" ref={progressMenuRef}>
            <div className="flex">
              {/* Outline, and sentence case. A filled button beside a hero
                  cover competes with the artwork for the same attention —
                  Home spends its one filled affordance on the global "Start
                  reading" FAB, and this was the app's only Title Case control. */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-r-none"
                onClick={() => { setFormError(null); setFormOpen(true); }}
              >
                Update progress
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="w-8 rounded-l-none border-l-0"
                onClick={() => setProgressMenuOpen((v) => !v)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={progressMenuOpen}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            {progressMenuOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-56 origin-top-left overflow-hidden rounded-xl border bg-card py-1 shadow-lg animate-[bt-menu-in_140ms_ease-out]"
              >
                {book.status !== "READ" || activeSession ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProgressMenuOpen(false);
                      handleStartReading();
                    }}
                    disabled={startSession.isPending}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {startSession.isPending
                      ? "Starting…"
                      : activeSession
                        ? activeSession.userBookId === book.id
                          ? "Continue reading session"
                          : "Open current session"
                        : "Start reading session"}
                  </button>
                ) : null}
                {book.status !== "READ" ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProgressMenuOpen(false);
                      setFinishing(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <BookCheck className="h-3.5 w-3.5" /> Mark as finished
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProgressMenuOpen(false);
                    setFormError(null);
                    setFormOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit details
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProgressMenuOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete book
                </button>
              </div>
            ) : null}
            {sessionError ? (
              <p className="mt-2 text-xs text-destructive">{sessionError}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Three Bands, not a tab bar. Tabs made this a record with views; a
          book's page is one document you read down — what it is, when you read
          it, what you thought. It also retires the segmented control whose
          inactive labels measured 4.29:1 against the track, under AA. */}
      <div className="space-y-8 sm:space-y-10">
        <Band label="About">
          <InfoTab book={book} />
        </Band>
        <Band label="Sessions">
          <SessionsTab userBookId={book.id} />
        </Band>
        <Band label="Notes">
          <NotesTab userBookId={book.id} />
        </Band>
      </div>

      {finishing ? (
        <FinishedMoment book={book} onClose={() => setFinishing(false)} />
      ) : null}

      {/* Edit modal — no onDelete here: it used to fire deleteMutation with
          zero confirmation (the only unconfirmed delete path in the app,
          unlike Library's kebab and Collections' delete, which both confirm
          first). The menu's "Delete book" above opens the real confirmation
          below instead. */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Edit book"
      >
        <BookForm
          key={book.id}
          initial={book}
          submitting={updateMutation.isPending}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Dialog>

      {/* Delete confirmation — same copy/structure as Library's, since this
          is the only other place a book can be deleted from. */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Remove book?"
      >
        <p className="text-sm text-muted-foreground">
          Remove <span className="font-medium text-foreground">{book.title}</span>{" "}
          from your library? This deletes your reading entry for it.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Removing…" : "Remove"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

// --- Info tab ---

function InfoTab({ book }: { book: ReturnType<typeof useBook>["data"] & object }) {
  // Fixed 2x3 grid — always these 6 cells, showing "—" for anything absent,
  // so the metadata section reads as one consistent block regardless of how
  // complete a book's data is. Format has no backing field anywhere in the
  // data model (confirmed against prisma/schema.prisma's Book model), so it
  // always shows "—" rather than fabricating a value.
  const cells: { label: string; value: string }[] = [
    { label: "Pages", value: book.pageCount ? book.pageCount.toLocaleString() : "—" },
    { label: "Publisher", value: book.publisher ?? "—" },
    { label: "Published", value: book.publishedDate ?? "—" },
    { label: "Language", value: book.language ? book.language.toUpperCase() : "—" },
    { label: "ISBN-13", value: book.isbn13 ?? "—" },
    { label: "Format", value: "—" },
  ];

  return (
    <div className="space-y-4">
      {/* No local heading — the enclosing Band already says "About". Capped to
          a readable measure; in the full-width shell this ran ~1250px a line. */}
      <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground line-clamp-6">
        {book.description || "No description available."}
      </p>

      {/* A colophon, not six tiles. This is the flat metadata off a book's
          copyright page — a definition list separated by hairlines, so it
          doesn't out-rank the description above it. */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 pt-2 sm:grid-cols-3">
        {cells.map((c) => (
          <InfoCell key={c.label} label={c.label} value={c.value} />
        ))}
      </dl>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-l border-border/60 pl-3">
      <dt className="text-caption-sm font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

// --- Sessions tab ---

function SessionsTab({ userBookId }: { userBookId: string }) {
  const { data, isLoading } = useSessions({ userBookId, pageSize: 50 });
  const items = data?.items ?? [];

  if (isLoading) {
    return <Loading label="Loading sessions…" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Timer}
        title="No sessions yet"
        description="Log a reading session to start tracking your progress on this book."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {items.length} session{items.length === 1 ? "" : "s"}
      </p>
      <div className="space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{formatDate(s.date)}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
                {formatDuration(s.minutes)}
                {s.pagesRead ? ` · ${s.pagesRead} pages` : ""}
                {s.mood ? ` · ${MOOD_EMOJI[s.mood]} ${MOOD_LABELS[s.mood]}` : ""}
              </p>
              {s.note ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
                  {s.note}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Notes tab ---

function NotesTab({ userBookId }: { userBookId: string }) {
  return <NotesView userBookId={userBookId} />;
}
