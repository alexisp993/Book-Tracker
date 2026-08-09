"use client";

import * as React from "react";
import { NotebookPen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FilterPills, type TabItem } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { NoteForm } from "@/components/NoteForm";
import { NoteTypeIcon } from "@/components/NoteTypeIcon";
import { ApiRequestError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/lib/queries";
import {
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
} from "@/lib/constants";
import type { NoteType } from "@/lib/constants";
import type { NoteDTO } from "@/lib/types";
import type { CreateNoteInput } from "@/lib/validation";

type ViewMode = "all" | "byBook";

// Today/Yesterday/absolute-date — derived from the note's real createdAt,
// matching the mockup's "Page 126 · Today" style without fabricating data.
function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => {
    const y = new Date(x);
    y.setHours(0, 0, 0, 0);
    return y.getTime();
  };
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDate(iso);
}

const VIEW_MODE_TABS: readonly TabItem<"all" | "byBook">[] = [
  { value: "all", label: "All Notes" },
  { value: "byBook", label: "Book Notes" },
];

const TYPE_FILTER_ITEMS: readonly TabItem<NoteType | "">[] = [
  { value: "", label: "All" },
  ...NOTE_TYPES.map((t) => ({
    value: t as NoteType | "",
    label: NOTE_TYPE_LABELS[t],
    icon: <NoteTypeIcon type={t} className="h-3 w-3" />,
  })),
];

export function NotesView({ userBookId }: { userBookId?: string }) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("all");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState<NoteType | "">("");
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NoteDTO | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // The "All Notes" / "Book Notes" tabs and the standalone header only make
  // sense on the full Notes page — when embedded inside Book Detail, the
  // list is already scoped to one book.
  const standalone = !userBookId;

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useNotes({
    userBookId,
    type: typeFilter || undefined,
    q: debouncedQ || undefined,
  });

  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  function openAdd() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(note: NoteDTO) {
    setEditing(note);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(values: CreateNoteInput) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: {
            body: values.body,
            page: values.page,
            type: values.type,
          },
        });
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
  const isEmpty = !isLoading && items.length === 0;
  const submitting = createMutation.isPending || updateMutation.isPending;

  // "Book Notes" groups the same flat list under a section header per book —
  // a presentation split, not a different data source (every note already
  // belongs to exactly one book).
  const grouped = React.useMemo(() => {
    const map = new Map<string, NoteDTO[]>();
    for (const n of items) {
      if (!map.has(n.bookTitle)) map.set(n.bookTitle, []);
      map.get(n.bookTitle)!.push(n);
    }
    return map;
  }, [items]);

  const groupedView = standalone && viewMode === "byBook";

  return (
    // Notes are prose — capped on the standalone page so lines stay readable
    // in the full-width shell. Embedded in Book Detail it inherits that page's
    // own width, so no cap there.
    <div className={standalone ? "mx-auto w-full max-w-4xl space-y-4" : "space-y-4"}>
      {standalone ? (
        <>
          {/* Page title + icon-only search/add actions */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Notes</h1>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Search notes"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={openAdd}
                className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Add note"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {searchOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search notes…"
                className="pl-8"
                autoFocus
              />
            </div>
          ) : null}

          {/* All Notes / Book Notes tabs */}
          <FilterPills
            value={viewMode}
            onChange={setViewMode}
            items={VIEW_MODE_TABS}
          />
        </>
      ) : null}

      {/* Type chip filter — secondary refinement row */}
      <FilterPills
        size="sm"
        value={typeFilter}
        onChange={setTypeFilter}
        items={TYPE_FILTER_ITEMS}
      />

      {/* Count */}
      {!isLoading && data ? (
        <p className="text-sm text-muted-foreground">
          {data.total} note{data.total === 1 ? "" : "s"}
        </p>
      ) : null}

      {/* List */}
      {isEmpty ? (
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          description="Add highlights, quotes, and thoughts as you read."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add note
            </Button>
          }
        />
      ) : groupedView ? (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([bookTitle, notes]) => (
            <div key={bookTitle} className="space-y-2">
              <h2 className="text-sm font-semibold">{bookTitle}</h2>
              <div className="space-y-2">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} showBookLink={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={openEdit} showBookLink={standalone} />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit note" : "Add a note"}
      >
        <NoteForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          defaultUserBookId={userBookId}
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

function NoteCard({
  note,
  onEdit,
  showBookLink,
}: {
  note: NoteDTO;
  onEdit: (note: NoteDTO) => void;
  showBookLink: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(note)}
      className="flex w-full items-start gap-3 rounded-xl border bg-card px-3 py-3 text-left hover:bg-secondary shadow-card transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:shadow-card-hover"
    >
      <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {note.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={note.coverUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <NotebookPen className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {showBookLink ? (
            <Link
              href={`/books/${note.userBookId}`}
              onClick={(e) => e.stopPropagation()}
              className="line-clamp-1 font-display text-title-sm font-semibold leading-tight hover:underline"
            >
              {note.bookTitle}
            </Link>
          ) : (
            <span className="text-caption-sm font-medium text-muted-foreground">
              {NOTE_TYPE_LABELS[note.type]}
            </span>
          )}
          <span
            className="shrink-0 text-muted-foreground"
            title={NOTE_TYPE_LABELS[note.type]}
            aria-label={NOTE_TYPE_LABELS[note.type]}
          >
            <NoteTypeIcon type={note.type} />
          </span>
        </div>
        <p className="text-caption-sm text-muted-foreground">
          {note.page ? `Page ${note.page} · ` : ""}
          {formatRelativeDate(note.createdAt)}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed">{note.body}</p>
      </div>
    </button>
  );
}
