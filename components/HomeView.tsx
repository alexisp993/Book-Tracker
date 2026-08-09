"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Search, Settings2, TrendingUp } from "lucide-react";
import { StreakBanner } from "@/components/StreakBanner";
import { ContinueReadingCard } from "@/components/ContinueReadingCard";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ReadingInsights } from "@/components/dashboard/ReadingInsights";
import { RecentNotesCard } from "@/components/dashboard/RecentNotesCard";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";
import { HomeReadingCalendarPreviewCard } from "@/components/HomeReadingCalendarPreviewCard";
import { HomeCustomizer } from "@/components/HomeCustomizer";
import { BookScrollRow } from "@/components/BookScrollRow";
import { FallbackCoverImg } from "@/components/FallbackCoverImg";
import { Card } from "@/components/ui/card";
import { Section } from "@/components/ui/section";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useBooks, useGroups, useHomeConfig } from "@/lib/queries";
import type { BookGroup } from "@/lib/types";
import type { HomeSectionKey } from "@/lib/homeConfig";
import { DEFAULT_HOME_CONFIG, SECTION_SPAN } from "@/lib/homeConfig";
import { cn } from "@/lib/utils";

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

// A shelf is a labelled region of the page, not a bounded object, so it gets
// a heading and open space rather than a border and a shadow. This was the
// app's most-repeated instance of the boxes-inside-boxes problem: a Card
// wrapping a scroll row wrapping a framed cover, three rounded rectangles
// deep, with the covers — the only thing worth looking at — innermost and
// smallest.
function Shelf({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <Section
      title={title}
      className="h-full"
      actions={
        <Link
          href={seeAllHref}
          className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See All <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {children}
    </Section>
  );
}

function ShelfPreview({ group }: { group: BookGroup }) {
  return (
    <Link href="/shelves" className="group flex w-[120px] shrink-0 flex-col gap-2">
      <div className="h-[80px] w-[120px] overflow-hidden rounded-xl border bg-muted shadow-sm transition-transform group-hover:scale-[1.02]">
        {group.covers.length > 0 ? (
          // Each tile goes through FallbackCoverImg rather than a bare image
          // tag: these were the app's other unguarded cover path, so an
          // Amazon 1x1 placeholder (HTTP 200, never fires onError) rendered as
          // a smear in the mosaic. A shelf thumbnail is not a book cover, so
          // it keeps its own landscape box rather than joining CoverFrame.
          <div className="grid h-full grid-cols-2 gap-px">
            {group.covers.slice(0, 4).map((url, i) => (
              <FallbackCoverImg key={i} candidates={[url]} alt="" />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary/60" />
          </div>
        )}
      </div>
      <div>
        <p className="line-clamp-1 text-caption-sm font-medium">{group.name}</p>
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
  const [search, setSearch] = React.useState("");
  const greeting = useGreeting();

  const name = user?.name?.split(" ")[0] ?? null;

  const config = homeConfig ?? DEFAULT_HOME_CONFIG;
  const orderedVisible = config
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.key);

  // Gated to the section actually being shown — with the leaner default
  // (most sections now off), fetching all four unconditionally meant most
  // accounts downloaded shelf/book-group data for rows they'd never see.
  // Flips to enabled the instant a hidden section is toggled back on in the
  // customizer, same as any other reactive query.
  const { data: currentlyReading } = useBooks(
    { status: "CURRENTLY_READING", pageSize: 8 },
    { enabled: orderedVisible.includes("currentlyReading") },
  );
  const { data: wantToRead } = useBooks(
    { status: "WANT_TO_READ", pageSize: 10 },
    { enabled: orderedVisible.includes("wantToRead") },
  );
  const { data: recentlyAdded } = useBooks(
    { sort: "createdAt", order: "desc", pageSize: 8 },
    { enabled: orderedVisible.includes("recentlyAdded") },
  );
  const { data: shelves } = useGroups("shelves", {
    enabled: orderedVisible.includes("myShelves"),
  });

  const currentlyReadingBooks = currentlyReading?.items ?? [];
  const wantToReadBooks = wantToRead?.items ?? [];
  const recentlyAddedBooks = recentlyAdded?.items ?? [];
  const shelvesData = shelves ?? [];

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/library/search?q=${encodeURIComponent(q)}` : "/library/search");
  }

  function renderSection(key: HomeSectionKey): React.ReactNode {
    switch (key) {
      case "todayProgress":
        return <KpiCards />;
      case "quickActions":
        return <QuickActions />;
      case "continueReading":
        return <ContinueReadingCard onContinue={(book) => router.push(`/books/${book.id}`)} />;
      case "readingGoal":
        return <ReadingGoalCard variant="ring" />;
      case "calendar":
        return <HomeReadingCalendarPreviewCard showSummary={false} />;
      case "insights":
        // This case used to hand-roll its own heading to escape Card's box,
        // and its copy of the classes had already drifted from Card's. It now
        // uses the shared Section, which is exactly what that workaround was
        // asking for.
        return (
          <Section
            title="Reading Insights"
            subtitle="Your reading year at a glance"
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            className="flex h-full flex-col gap-4"
          >
            <ReadingInsights />
          </Section>
        );
      case "currentlyReading":
        return currentlyReadingBooks.length > 0 ? (
          <Shelf title="Currently Reading" seeAllHref="/library?status=CURRENTLY_READING">
            <BookScrollRow books={currentlyReadingBooks} showProgress />
          </Shelf>
        ) : null;
      case "wantToRead":
        return wantToReadBooks.length > 0 ? (
          <Shelf title="Want to Read" seeAllHref="/library?status=WANT_TO_READ">
            <BookScrollRow books={wantToReadBooks} />
          </Shelf>
        ) : null;
      case "recentNotes":
        return <RecentNotesCard />;
      case "recentlyAdded":
        return recentlyAddedBooks.length > 0 ? (
          <Shelf title="Recently Added" seeAllHref="/library">
            <BookScrollRow books={recentlyAddedBooks} showTitle={false} />
          </Shelf>
        ) : null;
      case "myShelves":
        return shelvesData.length > 0 ? (
          <Shelf title="My Shelves" seeAllHref="/shelves">
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shelvesData.map((g) => (
                <ShelfPreview key={g.id} group={g} />
              ))}
            </div>
          </Shelf>
        ) : null;
      case "streak":
        return <StreakBanner />;
      default:
        return null;
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Dashboard header — greeting + search + customize */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {greeting}
              {name ? `, ${name}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every page you read today is a step forward.
            </p>
          </div>
          <div className="flex items-center gap-2 lg:w-full lg:max-w-md lg:justify-end">
            <form onSubmit={submitSearch} className="relative flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books, authors, genres…"
                className="pl-9"
                aria-label="Search books"
              />
            </form>
            <button
              type="button"
              onClick={() => setCustomizerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-card transition-colors hover:bg-secondary"
              aria-label="Customize home"
            >
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Config-driven dashboard grid — sections declare a column span; the
            grid reflows automatically when the customizer hides/reorders them.
            `items-stretch` (default) + `h-full` cells give equal-height rows. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 [grid-auto-flow:row_dense]">
          {orderedVisible.map((key) => {
            const rendered = renderSection(key);
            if (!rendered) return null;
            return (
              <div key={key} className={cn("min-w-0 h-full", SECTION_SPAN[key])}>
                {rendered}
              </div>
            );
          })}
        </div>
      </div>

      <HomeCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </>
  );
}
