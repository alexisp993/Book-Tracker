"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Library,
  ScanBarcode,
} from "lucide-react";
import { StreakBanner } from "@/components/StreakBanner";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { SessionSummaryStats } from "@/components/SessionSummaryStats";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";
import { ReadingCalendar } from "@/components/ReadingCalendar";
import { BookCover } from "@/components/BookCover";
import { useCurrentUser, useBooks, useGroups } from "@/lib/queries";
import type { LibraryBook, BookGroup } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Shared section header with optional "See All" link
function SectionHeader({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold">{title}</h2>
      {seeAllHref ? (
        <Link
          href={seeAllHref}
          className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See All <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}

// Compact book cover card for horizontal scroll rows
function MiniBookCard({ book }: { book: LibraryBook }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex w-[88px] shrink-0 flex-col gap-1.5"
    >
      <div className="h-[132px] w-[88px] overflow-hidden rounded-xl border bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
        <BookCover book={book} />
      </div>
      <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground/80">
        {book.title}
      </p>
    </Link>
  );
}

// Horizontal scroll row of book cover cards
function BookScrollRow({
  books,
  emptyText,
}: {
  books: LibraryBook[];
  emptyText?: string;
}) {
  if (books.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {emptyText ?? "No books here yet."}
      </p>
    );
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {books.map((b) => (
        <MiniBookCard key={b.id} book={b} />
      ))}
    </div>
  );
}

// Shelf card for "My Shelves" horizontal scroll
function ShelfCard({ group }: { group: BookGroup }) {
  return (
    <Link
      href="/shelves"
      className="group flex w-[120px] shrink-0 flex-col gap-2"
    >
      <div className="h-[80px] w-[120px] overflow-hidden rounded-xl border bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
        {group.covers.length > 0 ? (
          <div className="grid h-full grid-cols-2 gap-px">
            {group.covers.slice(0, 4).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary/60" />
          </div>
        )}
      </div>
      <div>
        <p className="line-clamp-1 text-[11px] font-medium">{group.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {group.count} {group.count === 1 ? "book" : "books"}
        </p>
      </div>
    </Link>
  );
}

export function HomeView() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const name = user?.name?.split(" ")[0] ?? null;

  const { data: currentlyReading } = useBooks({
    status: "CURRENTLY_READING",
    pageSize: 8,
  });
  const { data: wantToRead } = useBooks({
    status: "WANT_TO_READ",
    pageSize: 10,
  });
  const { data: recentlyAdded } = useBooks({
    sort: "createdAt",
    order: "desc",
    pageSize: 8,
  });
  const { data: shelves } = useGroups("shelves");

  const currentlyReadingBooks = currentlyReading?.items ?? [];
  const wantToReadBooks = wantToRead?.items ?? [];
  const recentlyAddedBooks = recentlyAdded?.items ?? [];
  const shelvesData = shelves ?? [];

  return (
    <div className="space-y-6">
      {/* 1. Greeting */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready to read something great?
        </p>
      </div>

      {/* 2. Reading Streak */}
      <StreakBanner />

      {/* 3. Continue Reading */}
      <ContinueReadingCard
        onContinue={(book) => router.push(`/books/${book.id}`)}
      />

      {/* 4. Today's Progress */}
      <SessionSummaryStats />

      {/* 5. Reading Goal */}
      <ReadingGoalCard />

      {/* 6. Currently Reading */}
      {currentlyReadingBooks.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Currently Reading"
            seeAllHref="/library?status=CURRENTLY_READING"
          />
          <BookScrollRow books={currentlyReadingBooks} />
        </section>
      ) : null}

      {/* 7. Want to Read */}
      {wantToReadBooks.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            title="Want to Read"
            seeAllHref="/library?status=WANT_TO_READ"
          />
          <BookScrollRow books={wantToReadBooks} />
        </section>
      ) : null}

      {/* 8. Recently Added */}
      {recentlyAddedBooks.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="Recently Added" seeAllHref="/library" />
          <BookScrollRow books={recentlyAddedBooks} />
        </section>
      ) : null}

      {/* 9. My Shelves */}
      {shelvesData.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="My Shelves" seeAllHref="/shelves" />
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shelvesData.map((g) => (
              <ShelfCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 10. Calendar Preview */}
      <section className="space-y-3">
        <SectionHeader title="Reading Calendar" seeAllHref="/calendar" />
        <ReadingCalendar />
      </section>

      {/* 11. Quick Actions */}
      <section className="space-y-3">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/library?scan=1"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition-colors hover:bg-secondary"
          >
            <ScanBarcode className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Scan Book</span>
          </Link>
          <Link
            href="/library"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition-colors hover:bg-secondary"
          >
            <Library className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">My Library</span>
          </Link>
          <Link
            href="/sessions"
            className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition-colors hover:bg-secondary"
          >
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Sessions</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
