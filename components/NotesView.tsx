"use client";

import * as React from "react";
import { NotebookPen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { NoteForm } from "@/components/NoteForm";
import { ApiRequestError } from "@/lib/api";
import {
  useCreateNote,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/lib/queries";
import {
  NOTE_TYPES,
  NOTE_TYPE_EMOJI,
  NOTE_TYPE_LABELS,
} from "@/lib/constants";
import type { NoteType } from "@/lib/constants";
import type { NoteDTO } from "@/lib/types";
import type { CreateNoteInput } from "@/lib/validation";

export function NotesView({ userBookId }: { userBookId?: string }) {
  const [typeFilter, setTypeFilter] = React.useState<NoteType | "">("");
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<NoteDTO | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            className="pl-8"
          />
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {/* Type chip filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTypeFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            typeFilter === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {NOTE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(t === typeFilter ? "" : t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {NOTE_TYPE_EMOJI[t]} {NOTE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

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
      ) : (
        <div className="space-y-2">
          {items.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={openEdit} />
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
}: {
  note: NoteDTO;
  onEdit: (note: NoteDTO) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(note)}
      className="w-full rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {NOTE_TYPE_EMOJI[note.type]} {NOTE_TYPE_LABELS[note.type]}
        </span>
        {note.page ? (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            p. {note.page}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed">{note.body}</p>
      {/* Show book link when viewing all notes (no userBookId scoping) */}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        <Link
          href={`/books/${note.userBookId}`}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
        >
          {note.bookTitle}
        </Link>
      </p>
    </button>
  );
}
