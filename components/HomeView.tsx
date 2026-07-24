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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentUser, useBooks, useGroups, useHomeConfig } from "@/lib/queries";
import type { BookGroup } from "@/lib/types";
import type { HomeSectionKey } from "@/lib/homeConfig";
import { DEFAULT_HOME_CONFIG, SECTION_SPAN } from "@/lib/homeConfig";
import { cn } from "@/lib/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ShelfCard({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <Card
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
    </Card>
  );
}

function ShelfPreview({ group }: { group: BookGroup }) {
  return (
    <Link href="/shelves" className="group flex w-[120px] shrink-0 flex-col gap-2">
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
                loading="lazy"
                decoding="async"
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
  const [search, setSearch] = React.useState("");

  const name = user?.name?.split(" ")[0] ?? null;

  const config = homeConfig ?? DEFAULT_HOME_CONFIG;
  const orderedVisible = config
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order)
    .map((s) => s.key);

  const { data: currentlyReading } = useBooks({ status: "CURRENTLY_READING", pageSize: 8 });
  const { data: wantToRead } = useBooks({ status: "WANT_TO_READ", pageSize: 10 });
  const { data: recentlyAdded } = useBooks({ sort: "createdAt", order: "desc", pageSize: 8 });
  const { data: shelves } = useGroups("shelves");

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
        // Header mirrors the Reading Calendar section beside it (same serif
        // title + icon + subtitle + 16px gap) so the two cards in this row
        // share a top edge instead of the tiles floating above the heatmap.
        return (
          <section className="flex h-full flex-col gap-4">
            <div>
              <h2 className="flex items-center gap-1.5 font-display text-lg font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Reading Insights
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your reading year at a glance
              </p>
            </div>
            <ReadingInsights />
          </section>
        );
      case "currentlyReading":
        return currentlyReadingBooks.length > 0 ? (
          <ShelfCard title="Currently Reading" seeAllHref="/library?status=CURRENTLY_READING">
            <BookScrollRow books={currentlyReadingBooks} showProgress />
          </ShelfCard>
        ) : null;
      case "wantToRead":
        return wantToReadBooks.length > 0 ? (
          <ShelfCard title="Want to Read" seeAllHref="/library?status=WANT_TO_READ">
            <BookScrollRow books={wantToReadBooks} />
          </ShelfCard>
        ) : null;
      case "recentNotes":
        return <RecentNotesCard />;
      case "recentlyAdded":
        return recentlyAddedBooks.length > 0 ? (
          <ShelfCard title="Recently Added" seeAllHref="/library">
            <BookScrollRow books={recentlyAddedBooks} showTitle={false} />
          </ShelfCard>
        ) : null;
      case "myShelves":
        return shelvesData.length > 0 ? (
          <ShelfCard title="My Shelves" seeAllHref="/shelves">
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shelvesData.map((g) => (
                <ShelfPreview key={g.id} group={g} />
              ))}
            </div>
          </ShelfCard>
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
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting()}
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
