"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  FolderHeart,
  House,
  NotebookPen,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReadingTimer } from "@/components/ReadingTimer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";

const NAV = [
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
      {/* Keyboard users land here first — a persistent header plus a bottom tab
          bar is a lot of tab stops to wade through on every page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
              <BookMarked className="h-4 w-4" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              Book Tracker
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-6 hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 pb-28 pt-6 focus:outline-none sm:px-6 sm:pb-14 sm:pt-8"
      >
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="flex items-stretch">
          {NAV.map((item) => {
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
