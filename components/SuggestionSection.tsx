"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useCreateBook, useSuggestions } from "@/lib/queries";
import type { SuggestionItem } from "@/lib/api";

export function SuggestionSection() {
  const { data: suggestions = [], isLoading } = useSuggestions();
  const createBook = useCreateBook();

  if (isLoading) return null;
  if (suggestions.length === 0) {
    return (
      <section className="space-y-3">
        <SuggestionHeader />
        <EmptyState
          icon={Sparkles}
          title="No suggestions yet"
          description="Rate or finish some books to get personalised recommendations from your TBR pile."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <SuggestionHeader />
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {suggestions.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Suggestions are from your Want to Read list, ranked by genre, author, and series match.
      </p>
    </section>
  );
}

function SuggestionHeader() {
  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold">Pick Your Next Read</h2>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: SuggestionItem }) {
  return (
    <Link
      href={`/books/${suggestion.id}`}
      className="group flex w-[140px] shrink-0 flex-col gap-2"
    >
      <div className="relative h-[210px] w-[140px] overflow-hidden rounded-xl border bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
        {suggestion.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={suggestion.coverUrl}
            alt={suggestion.title}
            className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10 p-3">
            <p className="text-center text-xs font-medium leading-snug text-primary/60">
              {suggestion.title}
            </p>
          </div>
        )}
        {suggestion.reasons[0] ? (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6">
            <p className="line-clamp-2 text-[10px] leading-tight text-white/90">
              {suggestion.reasons[0]}
            </p>
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-caption-sm font-medium leading-tight">
          {suggestion.title}
        </p>
        {suggestion.authors[0] ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
            {suggestion.authors[0]}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
