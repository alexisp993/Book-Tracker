"use client";

import * as React from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ApiRequestError,
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
  type GroupBasePath,
} from "@/lib/api";
import type { BookGroup, LibraryBook } from "@/lib/types";

export function GroupsView({
  base,
  singular,
}: {
  base: GroupBasePath;
  singular: string;
}) {
  const [groups, setGroups] = React.useState<BookGroup[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BookGroup | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState<BookGroup | null>(null);
  const [openBooks, setOpenBooks] = React.useState<LibraryBook[]>([]);
  const [openLoading, setOpenLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await listGroups(base));
    } finally {
      setLoading(false);
    }
  }, [base]);

  React.useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setError(null);
    setCreateOpen(true);
  }
  function startRename(g: BookGroup) {
    setEditing(g);
    setName(g.name);
    setDescription(g.description ?? "");
    setError(null);
    setCreateOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateGroup(base, editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await createGroup(base, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openGroup(g: BookGroup) {
    setOpen(g);
    setOpenLoading(true);
    try {
      const result = await getGroup(base, g.id);
      setOpenBooks(result.books);
      setOpen(result.group);
    } finally {
      setOpenLoading(false);
    }
  }

  async function remove(g: BookGroup) {
    if (!confirm(`Delete “${g.name}”? The books stay in your library.`)) return;
    await deleteGroup(base, g.id);
    setOpen(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" /> New {singular}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <BookOpen className="h-9 w-9 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No {singular}s yet</p>
            <p className="text-sm text-muted-foreground">
              Create one, then add books to it from a book&rsquo;s edit screen.
            </p>
          </div>
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" /> New {singular}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.id}
              className="group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => openGroup(g)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <CoverStack covers={g.covers} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold">
                    {g.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.count} book{g.count === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => startRename(g)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label={`Rename ${g.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(g)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  aria-label={`Delete ${g.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / rename dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={editing ? `Rename ${singular}` : `New ${singular}`}
      >
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={base === "shelves" ? "Sci-Fi" : "Best of 2026"}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-desc">Description (optional)</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Group detail dialog */}
      <Dialog
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open?.name ?? ""}
        description={open?.description ?? undefined}
      >
        {openLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : openBooks.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No books here yet. Open a book in your library, tap Edit, and add it
            to this {singular}.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {openBooks.map((b) => (
              <div key={b.id} className="space-y-1">
                <div className="aspect-[2/3] overflow-hidden rounded-lg border bg-muted">
                  <MiniCover book={b} />
                </div>
                <p className="line-clamp-2 text-[11px] font-medium leading-tight">
                  {b.title}
                </p>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function CoverStack({ covers }: { covers: string[] }) {
  if (covers.length === 0) {
    return (
      <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
        <BookOpen className="h-5 w-5 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <div className="flex shrink-0 -space-x-3">
      {covers.slice(0, 3).map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={c}
          alt=""
          className="h-16 w-12 rounded-md border-2 border-card object-cover shadow-sm"
          style={{ zIndex: 3 - i }}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}
    </div>
  );
}

function MiniCover({ book }: { book: LibraryBook }) {
  const [idx, setIdx] = React.useState(0);
  const src = book.coverCandidates[idx];
  if (!src)
    return (
      <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
        {book.title}
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
      onLoad={(e) => e.currentTarget.naturalWidth <= 2 && setIdx((i) => i + 1)}
    />
  );
}
