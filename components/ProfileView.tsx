"use client";

import * as React from "react";
import Link from "next/link";
import {
  Leaf,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sun,
  Timer,
} from "lucide-react";
import { StatsView } from "@/components/StatsView";
import { applyTheme } from "@/components/ThemeToggle";
import { useCurrentUser } from "@/lib/queries";
import type { Theme } from "@/components/ThemeToggle";

export function ProfileView() {
  const { data: me } = useCurrentUser();

  const initials = me?.name
    ? me.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : me?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-8">
      {/* User card */}
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0">
          {me?.name ? (
            <p className="font-display text-lg font-semibold leading-tight">
              {me.name}
            </p>
          ) : null}
          <p className="truncate text-sm text-muted-foreground">{me?.email}</p>
          {me?.isAdmin ? (
            <span className="mt-1 inline-block rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
              Admin
            </span>
          ) : null}
        </div>
      </div>

      {/* Reading stats */}
      <section>
        <SectionHeader title="Reading Stats" />
        <StatsView />
      </section>

      {/* Reading history */}
      <section className="space-y-2">
        <SectionHeader title="Activity" />
        <Link
          href="/sessions"
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-secondary"
        >
          <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Reading History</p>
            <p className="text-xs text-muted-foreground">
              All your logged sessions
            </p>
          </div>
          <span className="text-xs text-muted-foreground">View →</span>
        </Link>
      </section>

      {/* Appearance */}
      <section className="space-y-2">
        <SectionHeader title="Appearance" />
        <AppearancePicker />
      </section>

      {/* Settings & Links */}
      <section className="space-y-2">
        <SectionHeader title="Settings" />
        <div className="overflow-hidden rounded-xl border bg-card divide-y divide-border/60">
          <SettingsLink
            href="/feedback"
            icon={<MessageSquare className="h-4 w-4" />}
            label="Send Feedback"
            description="Report a bug or request a feature"
          />
          <SettingsLink
            href="/my-feedback"
            icon={<MessageSquare className="h-4 w-4" />}
            label="My Feedback"
            description="View your submitted feedback"
          />
          {me?.isAdmin ? (
            <>
              <SettingsLink
                href="/admin/dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Beta Dashboard"
                description="Usage stats and health metrics"
              />
              <SettingsLink
                href="/admin/feedback"
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Admin Feedback"
                description="Review all user feedback"
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Log out */}
      <section>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {title}
    </h2>
  );
}

const THEMES: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="h-4 w-4" />,
    description: "Warm parchment",
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="h-4 w-4" />,
    description: "Midnight ink",
  },
  {
    value: "forest",
    label: "Forest",
    icon: <Leaf className="h-4 w-4" />,
    description: "Deep woodland green",
  },
];

function AppearancePicker() {
  const [current, setCurrent] = React.useState<Theme>("light");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("bt_theme") as Theme | null;
      if (stored === "dark" || stored === "forest" || stored === "light") {
        setCurrent(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  function select(theme: Theme) {
    applyTheme(theme);
    setCurrent(theme);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => select(t.value)}
          className={[
            "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors",
            current === t.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card hover:bg-secondary",
          ].join(" ")}
          aria-pressed={current === t.value}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm">
            {t.icon}
          </span>
          <div>
            <p className="text-xs font-semibold">{t.label}</p>
            <p className="text-[10px] text-muted-foreground">{t.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function SettingsLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary"
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span className="text-xs text-muted-foreground">→</span>
    </Link>
  );
}
