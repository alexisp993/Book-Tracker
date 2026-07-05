"use client";

import * as React from "react";
import { BookOpen, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ApiRequestError, type GroupBasePath } from "@/lib/api";
import { colorForName, GROUP_TINTS } from "@/lib/colorHash";
import { cn } from "@/lib/utils";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroups,
  useUpdateGroup,
} from "@/lib/queries";
import type { BookGroup, LibraryBook } from "@/lib/types";

export function GroupsView({
  base,
  singular,
}: {
  base: GroupBasePath;
  singular: string;
}) {
  const { data: groups, isLoading: loading } = useGroups(base);
  const createMutation = useCreateGroup(base);
  const updateMutation = useUpdateGroup(base);
  const deleteMutation = useDeleteGroup(base);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BookGroup | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const [openId, setOpenId] = React.useState<string | null>(null);
  const openMeta = groups?.find((g) => g.id === openId) ?? null;
  const { data: detail, isLoading: openLoading } = useGroup(
    base,
    openId ?? undefined,
  );

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
    setError(null);
    const input = { name: name.trim(), description: description.trim() || undefined };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setCreateOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  async function remove(g: BookGroup) {
    if (!confirm(`Delete “${g.name}”? The books stay in your library.`)) return;
    await deleteMutation.mutateAsync(g.id);
    setOpenId(null);
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" /> New {singular}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !groups || groups.length === 0 ? (
        <EmptyState
          icon={Library}
          title={`No ${singular}s yet`}
          description="Create one, then add books to it from a book's edit screen."
          action={
            <Button onClick={startCreate}>
              <Plus className="h-4 w-4" /> New {singular}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {groups.map((g) => {
            const tint = colorForName(g.name);
            return (
              <div
                key={g.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-4 transition-shadow hover:shadow-md",
                  GROUP_TINTS[tint].badge,
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(g.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20">
                    <Library className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold leading-tight">
                      {g.name}
                    </p>
                    <p className="text-xs opacity-70">
                      {g.count} book{g.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
                {/* Edit/delete stay reachable but recede until hover, so the
                    resting card is a clean pastel bento tile. */}
                <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => startRename(g)}
                    className="rounded-md p-1.5 hover:bg-white/40 dark:hover:bg-black/30"
                    aria-label={`Rename ${g.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(g)}
                    className="rounded-md p-1.5 hover:bg-white/40 dark:hover:bg-black/30"
                    aria-label={`Delete ${g.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
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
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={detail?.group.name ?? openMeta?.name ?? ""}
        description={detail?.group.description ?? openMeta?.description ?? undefined}
      >
        {openLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !detail || detail.books.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No books here yet"
            description={`Open a book in your library, tap Edit, and add it to this ${singular}.`}
          />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {detail.books.map((b) => (
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
