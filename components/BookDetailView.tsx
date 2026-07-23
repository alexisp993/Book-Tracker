"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Heart,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { SegmentedTabs, type TabItem } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { BackHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/bar";
import { Dialog } from "@/components/ui/dialog";
import { BookCover } from "@/components/BookCover";
import { StatusBadge } from "@/components/StatusBadge";
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

type Tab = "info" | "sessions" | "notes";

const DETAIL_TABS: readonly TabItem<Tab>[] = [
  { value: "info", label: "Info" },
  { value: "sessions", label: "Sessions" },
  { value: "notes", label: "Notes" },
];

export function BookDetailView({ id }: { id: string }) {
  const { data: book, isLoading } = useBook(id);
  const [tab, setTab] = React.useState<Tab>("info");
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
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
        <Loading />
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
    <div className="space-y-6">
      <BackHeader href="/library" backLabel="Back to Library" />

      {/* Header card — explicit two-column hero: cover left, content right */}
      <Card className="grid grid-cols-[auto_1fr] gap-4">
        <div className="aspect-[2/3] w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
          <BookCover book={book} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">
            {book.title}
          </h1>
          {book.subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground leading-snug">
              {book.subtitle}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">
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
            <div className="mt-3">
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
              form; the chevron reveals the reading-session entry point, so
              the hero has one action control instead of a separate pencil
              icon + full-width Start button. */}
          <div className="relative mt-4" ref={progressMenuRef}>
            <div className="flex">
              <Button
                type="button"
                size="sm"
                className="rounded-r-none"
                onClick={() => { setFormError(null); setFormOpen(true); }}
              >
                Update Progress
              </Button>
              <Button
                type="button"
                size="icon"
                className="w-8 rounded-l-none border-l border-primary-foreground/20"
                onClick={() => setProgressMenuOpen((v) => !v)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={progressMenuOpen}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            {progressMenuOpen && (book.status !== "READ" || activeSession) ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-1 w-56 origin-top-left overflow-hidden rounded-xl border bg-card py-1 shadow-lg animate-[bt-menu-in_140ms_ease-out]"
              >
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
              </div>
            ) : null}
            {sessionError ? (
              <p className="mt-2 text-xs text-destructive">{sessionError}</p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Tab bar */}
      <SegmentedTabs value={tab} onChange={setTab} items={DETAIL_TABS} />

      {/* Tab content */}
      {tab === "info" && <InfoTab book={book} />}
      {tab === "sessions" && <SessionsTab userBookId={book.id} />}
      {tab === "notes" && <NotesTab userBookId={book.id} />}

      {/* Edit modal */}
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
          onDelete={() => {
            deleteMutation.mutate(book.id);
            setFormOpen(false);
          }}
        />
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
      <div>
        <h2 className="mb-1.5 text-sm font-semibold">About</h2>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-6">
          {book.description || "No description available."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cells.map((c) => (
          <InfoCell key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

// --- Sessions tab ---

function SessionsTab({ userBookId }: { userBookId: string }) {
  const { data, isLoading } = useSessions({ userBookId, pageSize: 50 });
  const items = data?.items ?? [];

  if (isLoading) {
    return <Loading />;
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
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5"
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
