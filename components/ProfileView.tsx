"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Cloud,
  HelpCircle,
  Palette,
  Settings as SettingsIcon,
  Target,
} from "lucide-react";
import { useCurrentUser } from "@/lib/queries";

const MENU_ITEMS = [
  { href: "/profile/stats", icon: BarChart3, label: "Reading Stats" },
  { href: "/profile/goals", icon: Target, label: "Reading Goals" },
  { href: "/profile/preferences", icon: Palette, label: "Reading Preferences" },
  { href: "/profile/backup", icon: Cloud, label: "Backup & Sync" },
  { href: "/profile/settings", icon: SettingsIcon, label: "Settings" },
  { href: "/profile/help", icon: HelpCircle, label: "Help & Support" },
];

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

  const memberSince = me?.createdAt
    ? new Date(me.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Account card */}
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {me?.name ? (
              <p className="truncate font-display text-base font-semibold leading-tight">
                {me.name}
              </p>
            ) : null}
            {me?.isAdmin ? (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
                Admin
              </span>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">{me?.email}</p>
          {memberSince ? (
            <p className="truncate text-xs text-muted-foreground">Member since {memberSince}</p>
          ) : null}
        </div>
        <Link
          href="/profile/settings"
          aria-label="Settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </div>

      {/* Menu */}
      <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary"
          >
            <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <span className="text-muted-foreground">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
