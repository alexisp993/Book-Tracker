"use client";

import * as React from "react";
import { NotebookPen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { FilterPills, type TabItem } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { NoteForm } from "@/components/NoteForm";
import { NoteTypeIcon } from "@/components/NoteTypeIcon";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
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

// Notes tile across the shell rather than stacking in one narrow column.
// Only on the standalone page — embedded in Book Detail the notes sit in a
// column beside other content and a grid would fight it.
const NOTE_GRID =
  "grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

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
    // Standalone Notes now spans the shell like Shelves. It can't do that as a
    // single column — one 1600px-wide note row is worse than the dead space it
    // replaced — so the list below becomes a multi-column masonry-ish grid.
    // Embedded in Book Detail it still inherits that page's width.
    <div className={standalone ? "w-full space-y-4" : "space-y-4"}>
      {standalone ? (
        <>
          {/* The shared header rather than a fourth hand-rolled <h1>. */}
          <PageHeader
            title="Notes"
            subtitle="Quotes, thoughts and marginalia from your reading."
            actions={
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
            }
          />

          {searchOpen ? (
            // Capped: a search field has no reason to run the width of the
            // shell now that the page isn't capped for it.
            <div className="relative max-w-md">
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
        // Authored, and left-aligned at a readable measure. The dashed
        // EmptyState box was already the wrong voice; once this page lost its
        // width cap it also stretched to 1600px, which made a centred "No
        // notes yet" look like a rendering failure.
        <div className="max-w-md py-4">
          <p className="font-display text-2xl leading-snug">No notes yet.</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A line you want to keep, a thought you had at page 200, an argument
            with the author. Anything you&rsquo;d have written in the margin.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 border-b border-primary/40 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" /> Write your first note
          </button>
        </div>
      ) : groupedView ? (
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([bookTitle, notes]) => (
            <div key={bookTitle} className="space-y-2">
              <h2 className="text-sm font-semibold">{bookTitle}</h2>
              <div className={standalone ? NOTE_GRID : "space-y-2"}>
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={openEdit} showBookLink={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={standalone ? NOTE_GRID : "space-y-2"}>
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
          // The last unguarded cover in the app. `display:none` on error left
          // the frame blank, and an Amazon 1x1 placeholder returns HTTP 200 so
          // onError never fires at all — it rendered as a smear. FallbackCoverImg
          // rejects sub-2px images and falls through to the icon below.
          <FallbackCoverImg candidates={[note.coverUrl]} alt="" />
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
