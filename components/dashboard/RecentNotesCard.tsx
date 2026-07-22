"use client";

import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNotes } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

// Compact recent-notes list. Each row: cover thumb, book title, a one-line
// body preview, and a relative timestamp; clicking opens the note's book.
export function RecentNotesCard() {
  const { data } = useNotes({ pageSize: 4 });
  const notes = data?.items ?? [];

  return (
    <Card
      title="Recent Notes"
      actions={
        <Link
          href="/notes"
          className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See All <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No notes yet.
        </p>
      ) : (
        <div className="space-y-1">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/books/${n.bookId}`}
              className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary"
            >
              <div className="flex h-12 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {n.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.coverUrl}
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
                <p className="truncate text-sm font-medium leading-tight">{n.bookTitle}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  {formatDate(n.updatedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
