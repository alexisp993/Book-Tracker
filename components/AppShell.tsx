"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  FolderHeart,
  House,
  NotebookPen,
  Timer,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadingTimer } from "@/components/ReadingTimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

// The full sidebar nav (desktop) — every top-level route.
const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/collections", label: "Collections", icon: FolderHeart },
  { href: "/sessions", label: "Reading Session", icon: Timer },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/profile", label: "Profile", icon: User },
] as const;

// The mobile bottom bar keeps a focused 4 — eight tabs don't fit a phone bar;
// the rest are reachable from Home and within the app.
const MOBILE_NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/collections", label: "Collections", icon: FolderHeart },
  { href: "/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No chrome on the auth screens.
  if (["/login", "/register", "/migrate"].includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/70 bg-background/95 backdrop-blur-md lg:flex">
        <Link href="/" className="flex h-16 shrink-0 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
            <BookMarked className="h-4 w-4" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            Book Tracker
          </span>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "")}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-3">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </aside>

      {/* Mobile / tablet top bar (below lg) */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <BookMarked className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              Book Tracker
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Content — offset by the sidebar on desktop, full-width up to a cap */}
      <main id="main" tabIndex={-1} className="focus:outline-none lg:pl-60">
        <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Mobile / tablet bottom tab bar (below lg) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="flex items-stretch">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <ReadingTimer />
    </div>
  );
}
