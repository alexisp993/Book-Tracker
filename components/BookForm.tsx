"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { StarRating } from "@/components/StarRating";
import { READING_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { useGroups } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { CreateBookInput } from "@/lib/validation";
import type { BookGroup, LibraryBook } from "@/lib/types";

export type BookFormValues = CreateBookInput;

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: BookGroup[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Controlled add/edit form. `initial` prefills for edit mode.
// Prefill for "add" mode (e.g. from a barcode scan). authors is a comma-separated string.
export interface BookPrefill {
  title?: string;
  subtitle?: string;
  authors?: string;
  description?: string;
  publisher?: string;
  publishedDate?: string;
  isbn13?: string;
  pageCount?: number;
  coverUrl?: string;
}

export function BookForm({
  initial,
  prefill,
  submitting,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: LibraryBook;
  prefill?: BookPrefill;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: BookFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = React.useState(
    initial?.title ?? prefill?.title ?? "",
  );
  const [authors, setAuthors] = React.useState(
    initial ? initial.authors.join(", ") : (prefill?.authors ?? ""),
  );
  const [status, setStatus] = React.useState<string>(
    initial?.status ?? "WANT_TO_READ",
  );
  const [rating, setRating] = React.useState<number>(initial?.rating ?? 0);
  const [favorite, setFavorite] = React.useState(initial?.favorite ?? false);
  const [pageCount, setPageCount] = React.useState(
    (initial?.pageCount ?? prefill?.pageCount)?.toString() ?? "",
  );
  const [currentPage, setCurrentPage] = React.useState(
    initial?.currentPage?.toString() ?? "",
  );
  const [publisher, setPublisher] = React.useState(
    initial?.publisher ?? prefill?.publisher ?? "",
  );
  const [publishedDate, setPublishedDate] = React.useState(
    initial?.publishedDate ?? prefill?.publishedDate ?? "",
  );
  const [isbn13, setIsbn13] = React.useState(
    initial?.isbn13 ?? prefill?.isbn13 ?? "",
  );
  const [coverUrl, setCoverUrl] = React.useState(
    initial?.coverUrl ?? prefill?.coverUrl ?? "",
  );
  const [description, setDescription] = React.useState(
    initial?.description ?? prefill?.description ?? "",
  );

  // Shelf membership. Cached (60s staleTime) and shared with GroupsView, so
  // this no longer re-fetches every time the dialog opens.
  const { data: shelves = [] } = useGroups("shelves");
  const [shelfIds, setShelfIds] = React.useState<string[]>(
    initial?.shelfIds ?? [],
  );
  // Collections lost their UI when the route was retired, but the field is
  // still submitted, seeded from whatever the book already had. Dropping it
  // from the payload would silently clear an existing book's memberships on
  // the next edit — the API treats an absent array as "empty", not "unchanged".
  const collectionIds = initial?.collectionIds ?? [];

  const toggle = (
    ids: string[],
    setIds: (v: string[]) => void,
    id: string,
  ) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const titleInvalid = title.trim().length === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (titleInvalid) return;
    onSubmit({
      title: title.trim(),
      authors: authors.trim() || undefined,
      status: status as CreateBookInput["status"],
      rating: rating || undefined,
      favorite,
      pageCount: pageCount ? Number(pageCount) : undefined,
      currentPage: currentPage ? Number(currentPage) : undefined,
      publisher: publisher.trim() || undefined,
      publishedDate: publishedDate.trim() || undefined,
      isbn13: isbn13.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      description: description.trim() || undefined,
      shelfIds,
      collectionIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Name of the Wind"
          aria-invalid={titleInvalid}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="authors">Author(s)</Label>
        <Input
          id="authors"
          value={authors}
          onChange={(e) => setAuthors(e.target.value)}
          placeholder="Comma-separated, e.g. Patrick Rothfuss"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {READING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Rating</Label>
          <div className="flex h-10 items-center">
            <StarRating value={rating || null} onChange={setRating} size={22} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="currentPage">Current page</Label>
          <Input
            id="currentPage"
            type="number"
            min={0}
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pageCount">Total pages</Label>
          <Input
            id="pageCount"
            type="number"
            min={0}
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="publisher">Publisher</Label>
          <Input
            id="publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publishedDate">Published</Label>
          <Input
            id="publishedDate"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            placeholder="2007"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="isbn13">ISBN-13</Label>
        <Input
          id="isbn13"
          value={isbn13}
          onChange={(e) => setIsbn13(e.target.value)}
          placeholder="9780756404741"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="coverUrl">Cover image URL</Label>
        <Input
          id="coverUrl"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {shelves.length > 0 ? (
        <ChipGroup
          label="Shelves"
          options={shelves}
          selected={shelfIds}
          onToggle={(id) => toggle(shelfIds, setShelfIds, id)}
        />
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={favorite}
          onChange={(e) => setFavorite(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Mark as favorite
      </label>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        {initial && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="mr-auto text-sm font-medium text-destructive hover:underline"
          >
            Remove
          </button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || titleInvalid}>
          {submitting
            ? "Saving…"
            : initial
              ? "Save changes"
              : "Add to library"}
        </Button>
      </div>
    </form>
  );
}
