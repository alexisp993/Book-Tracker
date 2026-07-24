"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import {
  NOTE_TYPES,
  NOTE_TYPE_LABELS,
} from "@/lib/constants";
import type { NoteType } from "@/lib/constants";
import type { NoteDTO } from "@/lib/types";
import type { CreateNoteInput } from "@/lib/validation";

interface NoteFormProps {
  initial?: NoteDTO;
  defaultUserBookId?: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: CreateNoteInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function NoteForm({
  initial,
  defaultUserBookId,
  submitting,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: NoteFormProps) {
  const [body, setBody] = React.useState(initial?.body ?? "");
  const [type, setType] = React.useState<NoteType>(initial?.type ?? "THOUGHT");
  const [page, setPage] = React.useState(initial?.page?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const userBookId = initial?.userBookId ?? defaultUserBookId;
    if (!userBookId) return;
    onSubmit({
      userBookId,
      body: body.trim(),
      type: type as CreateNoteInput["type"],
      page: page ? Number(page) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="note-type">Type</Label>
        <Select
          id="note-type"
          value={type}
          onChange={(e) => setType(e.target.value as NoteType)}
        >
          {NOTE_TYPES.map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note-body">Note</Label>
        <Textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note here…"
          rows={5}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note-page">Page (optional)</Label>
        <Input
          id="note-page"
          type="number"
          min={0}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          placeholder="e.g. 42"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={submitting}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !body.trim()}>
            {submitting ? "Saving…" : initial ? "Save changes" : "Add note"}
          </Button>
        </div>
      </div>
    </form>
  );
}
