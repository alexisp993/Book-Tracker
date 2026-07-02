"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Library,
  ScanBarcode,
  Settings2,
} from "lucide-react";
import { StreakBanner } from "@/components/StreakBanner";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { SessionSummaryStats } from "@/components/SessionSummaryStats";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";
import { ReadingCalendarCard } from "@/components/ReadingCalendarCard";
import { HomeCustomizer } from "@/components/HomeCustomizer";
import { BookCover } from "@/components/BookCover";
import { useCurrentUser, useBooks, useGroups, useHomeConfig } from "@/lib/queries";
import type { LibraryBook, BookGroup } from "@/lib/types";
import type { HomeSectionKey } from "@/lib/homeConfig";
import { DEFAULT_HOME_CONFIG } from "@/lib/homeConfig";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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

function BookScrollRow({ books }: { books: LibraryBook[] }) {
  if (books.length === 0) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {books.map((b) => (
        <MiniBookCard key={b.id} book={b} />
      ))}
    </div>
  );
}

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
  const { data: homeConfig } = useHomeConfig();
  const [customizerOpen, setCustomizerOpen] = React.useState(false);

  const name = user?.name?.split(" ")[0] ?? null;

  const config = homeConfig ?? DEFAULT_HOME_CONFIG;
  const orderedVisible = config
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.key);

  const visibleSet = new Set<HomeSectionKey>(orderedVisible);

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

  function renderSection(key: HomeSectionKey) {
    switch (key) {
      case "streak":
        return <StreakBanner />;

      case "continueReading":
        return (
          <ContinueReadingCard
            onContinue={(book) => router.push(`/books/${book.id}`)}
          />
        );

      case "todayProgress":
        return <SessionSummaryStats />;

      case "readingGoal":
        return <ReadingGoalCard />;

      case "currentlyReading":
        return currentlyReadingBooks.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader
              title="Currently Reading"
              seeAllHref="/library?status=CURRENTLY_READING"
            />
            <BookScrollRow books={currentlyReadingBooks} />
          </section>
        ) : null;

      case "wantToRead":
        return wantToReadBooks.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader
              title="Want to Read"
              seeAllHref="/library?status=WANT_TO_READ"
            />
            <BookScrollRow books={wantToReadBooks} />
          </section>
        ) : null;

      case "recentlyAdded":
        return recentlyAddedBooks.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="Recently Added" seeAllHref="/library" />
            <BookScrollRow books={recentlyAddedBooks} />
          </section>
        ) : null;

      case "myShelves":
        return shelvesData.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader title="My Shelves" seeAllHref="/shelves" />
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shelvesData.map((g) => (
                <ShelfCard key={g.id} group={g} />
              ))}
            </div>
          </section>
        ) : null;

      case "calendar":
        return (
          <section className="space-y-3">
            <SectionHeader title="Reading Calendar" seeAllHref="/calendar" />
            <ReadingCalendarCard />
          </section>
        );

      case "quickActions":
        return (
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
        );

      default:
        return null;
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Greeting header with customize button */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting()}
              {name ? `, ${name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ready to read something great?
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCustomizerOpen(true)}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
            aria-label="Customize home"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Config-ordered, visibility-filtered sections */}
        {orderedVisible.map((key) => {
          const rendered = renderSection(key);
          return rendered ? (
            <React.Fragment key={key}>{rendered}</React.Fragment>
          ) : null;
        })}
      </div>

      <HomeCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
      />
    </>
  );
}
