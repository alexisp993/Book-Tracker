"use client";

import * as React from "react";
import {
  BookOpen,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ApiRequestError, uploadGroupImage, type GroupBasePath } from "@/lib/api";
import { colorForName, GROUP_TINTS, type GroupTintKey } from "@/lib/colorHash";
import {
  COLLECTION_ICON_KEYS,
  iconComponent,
  type CollectionIconKey,
} from "@/lib/collectionIcons";
import { cn, formatDate } from "@/lib/utils";
import {
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroups,
  useUpdateGroup,
} from "@/lib/queries";
import type { BookGroup, LibraryBook } from "@/lib/types";

type SortKey = "updated" | "name" | "size";
type ViewMode = "grid" | "list";

// Relative "updated X ago" for the card meta line — Today / Yesterday / N days
// ago for the recent window, then falls back to the shared formatDate.
function updatedAgo(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso);
}

function tintFor(g: BookGroup): GroupTintKey {
  if (g.color && g.color in GROUP_TINTS) return g.color as GroupTintKey;
  return colorForName(g.name);
}

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

  const [sort, setSort] = React.useState<SortKey>("updated");
  const [view, setView] = React.useState<ViewMode>("grid");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BookGroup | null>(null);
  // Bumped on every open so the form dialog remounts with fresh state — the
  // dialog seeds its fields from `editing` via useState initializers, which
  // only re-run on remount. Without this, opening "create" twice in a row
  // would keep the first attempt's stale values.
  const [formNonce, setFormNonce] = React.useState(0);

  const [openId, setOpenId] = React.useState<string | null>(null);
  const openMeta = groups?.find((g) => g.id === openId) ?? null;
  const { data: detail, isLoading: openLoading } = useGroup(
    base,
    openId ?? undefined,
  );

  const sorted = React.useMemo(() => {
    const list = [...(groups ?? [])];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "size") list.sort((a, b) => b.count - a.count);
    else list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [groups, sort]);

  const totalBooks = (groups ?? []).reduce((sum, g) => sum + g.count, 0);

  function startCreate() {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }
  function startEdit(g: BookGroup) {
    setEditing(g);
    setFormNonce((n) => n + 1);
    setFormOpen(true);
  }

  async function remove(g: BookGroup) {
    if (!confirm(`Delete “${g.name}”? The books stay in your library.`)) return;
    await deleteMutation.mutateAsync(g.id);
    setOpenId(null);
  }

  return (
    <div className="space-y-5">
      {/* Toolbar: sort + view toggle + create */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-auto"
          aria-label={`Sort ${singular}s`}
        >
          <option value="updated">Recently updated</option>
          <option value="name">Name</option>
          <option value="size">Most books</option>
        </Select>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <ViewButton active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
              <GridIcon />
            </ViewButton>
            <ViewButton active={view === "list"} onClick={() => setView("list")} label="List view">
              <ListIcon />
            </ViewButton>
          </div>
          {/* Outline in the toolbar: the CreateCard tile below is already the
              primary way in, and two filled calls to the same action on one
              screen just compete. The empty state keeps its filled button,
              where it is the only thing to do. */}
          <Button variant="outline" onClick={startCreate}>
            <Plus className="h-4 w-4" /> New {singular}
          </Button>
        </div>
      </div>

      {loading ? (
        <Loading label={`Loading your ${singular}s…`} />
      ) : !groups || groups.length === 0 ? (
        // Authored, not a dashed box with a routing instruction in it. The old
        // copy ("Create one, then add books to it from a book's edit screen")
        // told the reader where the button lives; this tells them what the
        // feature is for. Same voice as CurrentlyReadingHero's empty state.
        <div className="max-w-md py-4">
          <p className="font-display text-2xl leading-snug">
            {singular === "shelf"
              ? "No shelves yet."
              : "No collections yet."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {singular === "shelf"
              ? "Group books by mood, by season, by whatever you like. A book can sit on as many shelves as you want."
              : "Keep a series, a reading order, or a list in the sequence you meant. Collections remember their order; shelves don't."}
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="mt-4 inline-flex items-center gap-1.5 border-b border-primary/40 pb-0.5 text-sm font-medium text-primary transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" /> Create your first {singular}
          </button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((g) => (
            <CollectionCard
              key={g.id}
              group={g}
              onOpen={() => setOpenId(g.id)}
              onEdit={() => startEdit(g)}
              onDelete={() => remove(g)}
            />
          ))}
          <CreateCard singular={singular} onClick={startCreate} />
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((g) => (
            <CollectionRow
              key={g.id}
              group={g}
              onOpen={() => setOpenId(g.id)}
              onEdit={() => startEdit(g)}
              onDelete={() => remove(g)}
            />
          ))}
        </div>
      )}

      {groups && groups.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {groups.length} {singular}
          {groups.length === 1 ? "" : "s"} · {totalBooks} book
          {totalBooks === 1 ? "" : "s"} in {singular}s
        </p>
      ) : null}

      <GroupFormDialog
        key={`${editing?.id ?? "new"}-${formNonce}`}
        open={formOpen}
        singular={singular}
        base={base}
        editing={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => setFormOpen(false)}
        onCreate={(input) => createMutation.mutateAsync(input)}
        onUpdate={(id, input) => updateMutation.mutateAsync({ id, input })}
      />

      {/* Group detail dialog */}
      <Dialog
        open={Boolean(openId)}
        onClose={() => setOpenId(null)}
        title={detail?.group.name ?? openMeta?.name ?? ""}
        description={detail?.group.description ?? openMeta?.description ?? undefined}
      >
        {openLoading ? (
          <Loading label="Loading books…" />
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
                <p className="line-clamp-2 text-caption-sm font-medium leading-tight">
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

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function CollectionCard({
  group,
  onOpen,
  onEdit,
  onDelete,
}: {
  group: BookGroup;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = tintFor(group);
  const Icon = iconComponent(group.icon);
  const extra = group.count - group.covers.length;

  return (
    // No overflow-hidden here: it clipped the kebab dropdown (which opens near
    // the card's bottom edge). The header band is clipped by its own inner
    // wrapper instead, and the article's border-radius still rounds the card.
    <article className="group rounded-2xl border bg-card shadow-card transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-card-hover">
      {/* Header band — uploaded image, else a soft tint. Whole band opens
          the collection. */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block h-28 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`Open ${group.name}`}
      >
        {/* Only the band is clipped to the top corners, so the badge below can
            still protrude past it. */}
        <span className="absolute inset-0 overflow-hidden rounded-t-2xl">
          {group.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className={cn("block h-full w-full", GROUP_TINTS[tint].badge)} />
          )}
        </span>
        {/* Icon badge — half over the seam between image and body. */}
        <span
          className={cn(
            "absolute -bottom-5 left-4 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm ring-4 ring-card",
            GROUP_TINTS[tint].solid,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </button>

      <div className="p-4 pt-7">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left focus-visible:outline-none"
          >
            <p className="truncate font-display text-base font-semibold leading-tight">
              {group.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {group.count} book{group.count === 1 ? "" : "s"} · Updated{" "}
              {updatedAgo(group.updatedAt)}
            </p>
          </button>
          <KebabMenu name={group.name} onEdit={onEdit} onDelete={onDelete} />
        </div>

        {group.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : null}

        {group.covers.length > 0 ? (
          <div className="mt-3 flex items-center gap-1.5">
            {group.covers.slice(0, 3).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-14 w-10 shrink-0 rounded-md border object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              />
            ))}
            {extra > 0 ? (
              <span className="flex h-14 min-w-10 items-center justify-center rounded-md border bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                +{extra}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

// Compact list-view row.
function CollectionRow({
  group,
  onOpen,
  onEdit,
  onDelete,
}: {
  group: BookGroup;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tint = tintFor(group);
  const Icon = iconComponent(group.icon);
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
            GROUP_TINTS[tint].solid,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-title-sm font-semibold leading-tight">
            {group.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {group.count} book{group.count === 1 ? "" : "s"} · Updated{" "}
            {updatedAgo(group.updatedAt)}
          </p>
        </div>
      </button>
      <KebabMenu name={group.name} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function CreateCard({
  singular,
  onClick,
}: {
  singular: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[13rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Plus className="h-5 w-5" />
      </span>
      <p className="font-display text-base font-semibold capitalize">
        Create {singular}
      </p>
      <p className="max-w-[14rem] text-xs text-muted-foreground">
        Start a new {singular} to organize your books.
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Kebab menu (edit / delete)
// ---------------------------------------------------------------------------
function KebabMenu({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-36 origin-top-right overflow-hidden rounded-xl border bg-card py-1 shadow-lg animate-[bt-menu-in_140ms_ease-out]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit dialog
// ---------------------------------------------------------------------------
function GroupFormDialog({
  open,
  singular,
  editing,
  submitting,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  singular: string;
  base: GroupBasePath;
  editing: BookGroup | null;
  submitting: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description?: string;
    imageUrl?: string | null;
    icon?: string | null;
    color?: string | null;
  }) => Promise<unknown>;
  onUpdate: (
    id: string,
    input: {
      name?: string;
      description?: string;
      imageUrl?: string | null;
      icon?: string | null;
      color?: string | null;
    },
  ) => Promise<unknown>;
}) {
  const [name, setName] = React.useState(editing?.name ?? "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [imageUrl, setImageUrl] = React.useState<string | null>(editing?.imageUrl ?? null);
  const [icon, setIcon] = React.useState<string | null>(editing?.icon ?? null);
  const [color, setColor] = React.useState<GroupTintKey | null>(
    (editing?.color as GroupTintKey) ?? null,
  );
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const effectiveTint: GroupTintKey = color ?? colorForName(name || "x");
  const PreviewIcon = iconComponent(icon);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadGroupImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      imageUrl,
      icon,
      color,
    };
    try {
      if (editing) await onUpdate(editing.id, input);
      else await onCreate(input);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${singular}` : `New ${singular}`}
    >
      <form onSubmit={save} className="space-y-4">
        {/* Header image */}
        <div className="space-y-1.5">
          <Label>Header image (optional)</Label>
          <div
            className={cn(
              "relative flex h-28 items-center justify-center overflow-hidden rounded-xl border",
              !imageUrl && GROUP_TINTS[effectiveTint].badge,
            )}
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-1 text-sm font-medium">
                <Upload className="h-5 w-5" />
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleImage}
                />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-name">Name</Label>
          <Input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={singular === "shelf" ? "Sci-Fi" : "Best of 2026"}
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

        {/* Icon picker */}
        <div className="space-y-1.5">
          <Label>Icon</Label>
          <div className="flex flex-wrap gap-1.5">
            {COLLECTION_ICON_KEYS.map((key) => {
              const Ic = iconComponent(key);
              const active = (icon ?? "library") === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key as CollectionIconKey)}
                  aria-label={key}
                  aria-pressed={active}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-secondary",
                  )}
                >
                  <Ic className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color picker */}
        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GROUP_TINTS) as GroupTintKey[]).map((key) => {
              const active = effectiveTint === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  aria-label={key}
                  aria-pressed={active}
                  className={cn(
                    "h-8 w-8 rounded-full ring-offset-2 ring-offset-card transition-shadow",
                    GROUP_TINTS[key].solid,
                    active ? "ring-2 ring-foreground" : "",
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Live preview badge */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-white",
              GROUP_TINTS[effectiveTint].solid,
            )}
          >
            <PreviewIcon className="h-4 w-4" />
          </span>
          Preview
        </div>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || uploading || !name.trim()}>
            {submitting ? "Saving…" : editing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
      <rect x="1" y="2" width="14" height="3" rx="1" />
      <rect x="1" y="6.5" width="14" height="3" rx="1" />
      <rect x="1" y="11" width="14" height="3" rx="1" />
    </svg>
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
