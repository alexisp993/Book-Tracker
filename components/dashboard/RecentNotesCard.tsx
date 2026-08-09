"use client";

import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CoverFrame } from "@/components/BookCover";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
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
      className="h-full"
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
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <NotebookPen className="h-4 w-4" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground/70">
            Highlights and thoughts you save will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/books/${n.bookId}`}
              className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-secondary"
            >
              {/* Was a raw image tag whose only guard was onError. Amazon serves a
                  1x1 placeholder GIF with HTTP 200, so onError never fires and
                  it renders as a stretched smear — the exact bug FallbackCoverImg's
                  naturalWidth<=2 check exists to catch. NoteDTO carries a single
                  resolved coverUrl rather than the candidate list, so this gains
                  the placeholder guard, not the full ISBN fallback walk. */}
              <CoverFrame
                size="xs"
                className="flex items-center justify-center shadow-none"
              >
                {n.coverUrl ? (
                  <FallbackCoverImg candidates={[n.coverUrl]} alt="" />
                ) : (
                  <NotebookPen className="h-4 w-4 text-muted-foreground/50" />
                )}
              </CoverFrame>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{n.bookTitle}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-0.5 text-caption-sm text-muted-foreground/70">
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
