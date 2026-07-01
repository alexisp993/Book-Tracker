"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Library, ScanBarcode } from "lucide-react";
import { StreakBanner } from "@/components/StreakBanner";
import { useCurrentUser } from "@/lib/queries";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView() {
  const { data: user } = useCurrentUser();
  const name = user?.name?.split(" ")[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {greeting()}{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ready to read something great?
        </p>
      </div>

      {/* Streak */}
      <StreakBanner />

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/library"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors hover:bg-secondary"
        >
          <Library className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">My Library</span>
        </Link>
        <Link
          href="/sessions"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors hover:bg-secondary"
        >
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Sessions</span>
        </Link>
        <Link
          href="/library?scan=1"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors hover:bg-secondary"
        >
          <ScanBarcode className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Scan Book</span>
        </Link>
        <Link
          href="/shelves"
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors hover:bg-secondary"
        >
          <ArrowRight className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">My Shelves</span>
        </Link>
      </div>

      {/* Go to library CTA */}
      <div className="flex items-center justify-between rounded-2xl border bg-card p-4">
        <div>
          <p className="font-medium">Your Library</p>
          <p className="text-sm text-muted-foreground">Browse all your books</p>
        </div>
        <Link
          href="/library"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          See All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
