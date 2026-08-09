"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { CurrentlyReadingHero } from "@/components/home/CurrentlyReadingHero";
import { YearInReading } from "@/components/home/YearInReading";
import { BookScrollRow } from "@/components/BookScrollRow";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { Heatmap } from "@/components/Heatmap";
import { Band } from "@/components/ui/section";
import { Input } from "@/components/ui/input";
import {
  useCalendarRange,
  useCurrentUser,
  useBooks,
  useGroups,
} from "@/lib/queries";
import type { BookGroup } from "@/lib/types";

// Home is an authored composition, not a configurable board.
//
// It used to be a 6-column grid driven by lib/homeConfig.ts: twelve
// interchangeable section keys, each declaring a column span, drag-reorderable
// and toggleable in a "Customize Home" dialog. That mechanism is precisely what
// made the page read as a dashboard — a grid of equal-weight blocks cannot
// express hierarchy, because every block claims the same rank by construction.
// The customizer, its API route, and lib/homeConfig.ts were retired with the
// user's agreement (User.homeConfig stays as an inert nullable column).
//
// What replaces it: one book at display scale, then shelves, then the year,
// then activity — a fixed reading order, separated by hairline rules rather
// than boxes.

// Time-of-day is inherently client-local, but this component is still
// server-rendered for the initial HTML — computing the greeting directly in
// render caused a real hydration mismatch (React error #418) whenever the
// server's clock (UTC on Vercel) and the reader's local clock landed in
// different morning/afternoon/evening bands. Deferring to an effect keeps the
// server and first client render identical, then swaps in the real greeting
// a tick later, after mount.
function useGreeting(): string {
  const [greeting, setGreeting] = React.useState("Welcome back");
  React.useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return greeting;
}

function ShelfPreview({ group }: { group: BookGroup }) {
  return (
    <Link href="/shelves" className="group flex w-[120px] shrink-0 flex-col gap-2">
      <div className="h-[80px] w-[120px] overflow-hidden rounded-lg border bg-muted shadow-cover transition-transform group-hover:-translate-y-0.5">
        {group.covers.length > 0 ? (
          // Each tile goes through FallbackCoverImg rather than a bare image
          // tag: these were the app's other unguarded cover path, so an
          // Amazon 1x1 placeholder (HTTP 200, never fires onError) rendered as
          // a smear in the mosaic.
          <div className="grid h-full grid-cols-2 gap-px">
            {group.covers.slice(0, 4).map((url, i) => (
              <FallbackCoverImg key={i} candidates={[url]} alt="" />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-secondary">
            <BookOpen className="h-5 w-5 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <div>
        <p className="line-clamp-1 font-display text-title-sm font-semibold leading-tight">
          {group.name}
        </p>
        <p className="text-caption-sm text-muted-foreground">
          {group.count} {group.count === 1 ? "book" : "books"}
        </p>
      </div>
    </Link>
  );
}

function ShelfRow({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <Link
          href={href}
          className="shrink-0 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          See all
        </Link>
      </div>
      {children}
    </div>
  );
}

export function HomeView() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [search, setSearch] = React.useState("");
  const greeting = useGreeting();

  const name = user?.name?.split(" ")[0] ?? null;
  const year = new Date().getFullYear();

  // The old `enabled` flags were gated on whether a section was visible in the
  // user's config. With a fixed composition every shelf is always part of the
  // page, so these are unconditional by design — but they stay page-size
  // capped, which is what the original gating was actually protecting against.
  const { data: currentlyReading } = useBooks({
    status: "CURRENTLY_READING",
    pageSize: 12,
  });
  const { data: wantToRead } = useBooks({ status: "WANT_TO_READ", pageSize: 12 });
  const { data: shelves } = useGroups("shelves");

  // Two years back, matching what the calendar preview used to request.
  const { data: calendarDays } = useCalendarRange(0, (1 + 1) * 371);

  const currentlyReadingBooks = currentlyReading?.items ?? [];
  const wantToReadBooks = wantToRead?.items ?? [];
  const shelvesData = shelves ?? [];

  const minutesByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const d of calendarDays ?? []) map.set(d.date, d.totalMinutes);
    return map;
  }, [calendarDays]);

  const [calendarYear, setCalendarYear] = React.useState(year);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/library/search?q=${encodeURIComponent(q)}` : "/library/search");
  }

  const hasShelves =
    currentlyReadingBooks.length > 0 ||
    wantToReadBooks.length > 0 ||
    shelvesData.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10 sm:space-y-14">
      {/* Masthead. The greeting is a salutation, not a page title — the book
          below it is what the page is about, so this stays quiet. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {greeting}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your reading life in {year}
          </p>
        </div>
        <form onSubmit={submitSearch} className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books, authors, genres…"
            className="pl-9"
            aria-label="Search books"
          />
        </form>
      </header>

      <CurrentlyReadingHero
        onContinue={(book) => router.push(`/books/${book.id}`)}
      />

      {hasShelves ? (
        <Band
          label="Your shelves"
          actions={
            <Link
              href="/library"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Library <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-8">
            {currentlyReadingBooks.length > 0 ? (
              <ShelfRow
                title="Currently reading"
                href="/library?status=CURRENTLY_READING"
              >
                {/* Titleless: a shelf is read by its spines. Repeating the
                    title under every cover was text noise competing with the
                    artwork that already identifies the book. */}
                <BookScrollRow
                  books={currentlyReadingBooks}
                  size="xl"
                  showTitle={false}
                />
              </ShelfRow>
            ) : null}

            {wantToReadBooks.length > 0 ? (
              <ShelfRow title="Want to read" href="/library?status=WANT_TO_READ">
                <BookScrollRow
                  books={wantToReadBooks}
                  size="xl"
                  showTitle={false}
                />
              </ShelfRow>
            ) : null}

            {shelvesData.length > 0 ? (
              <ShelfRow title="Collections" href="/shelves">
                <div className="flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {shelvesData.slice(0, 8).map((g) => (
                    <ShelfPreview key={g.id} group={g} />
                  ))}
                </div>
              </ShelfRow>
            ) : null}
          </div>
        </Band>
      ) : null}

      <YearInReading />

      <Band label="Reading activity">
        {/* The heatmap, unwrapped. It used to sit inside a Card inside a
            titled section — a box around a box around a grid. */}
        <Heatmap
          minutesByDate={minutesByDate}
          year={calendarYear}
          onYearChange={setCalendarYear}
          minYear={year - 1}
          isEmpty={minutesByDate.size === 0}
        />
      </Band>
    </div>
  );
}
