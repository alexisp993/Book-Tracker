"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useBooks } from "@/lib/queries";
import { MOOD_EMOJI, MOOD_LABELS, READING_MOODS } from "@/lib/constants";
import type { ReadingSessionDTO } from "@/lib/types";
import type { CreateSessionInput } from "@/lib/validation";

export function SessionForm({
  initial,
  submitting,
  error,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: ReadingSessionDTO;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: CreateSessionInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  // Shared cache with LibraryView/ReadingTimer — no longer refetches every
  // time this dialog opens.
  const { data: booksPage } = useBooks({
    pageSize: 100,
    sort: "createdAt",
    order: "desc",
  });
  const books = booksPage?.items ?? [];
  const [userBookId, setUserBookId] = React.useState(initial?.userBookId ?? "");
  const [date, setDate] = React.useState(
    initial ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [minutes, setMinutes] = React.useState(initial?.minutes?.toString() ?? "");
  const [pagesRead, setPagesRead] = React.useState(
    initial?.pagesRead?.toString() ?? "",
  );
  const [startPage, setStartPage] = React.useState(
    initial?.startPage?.toString() ?? "",
  );
  const [endPage, setEndPage] = React.useState(
    initial?.endPage?.toString() ?? "",
  );
  const [mood, setMood] = React.useState(initial?.mood ?? "");
  const [note, setNote] = React.useState(initial?.note ?? "");

  const invalid = !userBookId || !minutes || Number(minutes) <= 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    onSubmit({
      userBookId,
      date: date ? new Date(date) : undefined,
      minutes: Number(minutes),
      pagesRead: pagesRead ? Number(pagesRead) : undefined,
      startPage: startPage ? Number(startPage) : undefined,
      endPage: endPage ? Number(endPage) : undefined,
      mood: (mood || undefined) as CreateSessionInput["mood"],
      note: note.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="session-book">Book</Label>
        <Select
          id="session-book"
          value={userBookId}
          onChange={(e) => setUserBookId(e.target.value)}
          required
        >
          <option value="">Select a book…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="session-date">Date</Label>
          <Input
            id="session-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session-minutes">Minutes *</Label>
          <Input
            id="session-minutes"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="session-start-page">Start page</Label>
          <Input
            id="session-start-page"
            type="number"
            min={0}
            value={startPage}
            onChange={(e) => setStartPage(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="session-end-page">End page</Label>
          <Input
            id="session-end-page"
            type="number"
            min={0}
            value={endPage}
            onChange={(e) => setEndPage(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-pages">Pages read (optional override)</Label>
        <Input
          id="session-pages"
          type="number"
          min={0}
          value={pagesRead}
          onChange={(e) => setPagesRead(e.target.value)}
          placeholder="Auto-calculated from start/end page if left blank"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-mood-2">Mood</Label>
        <Select
          id="session-mood-2"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          <option value="">None</option>
          {READING_MOODS.map((m) => (
            <option key={m} value={m}>
              {MOOD_EMOJI[m]} {MOOD_LABELS[m]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="session-note-2">Notes</Label>
        <Textarea
          id="session-note-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

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
        <Button type="submit" disabled={submitting || invalid}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Log session"}
        </Button>
      </div>
    </form>
  );
}
