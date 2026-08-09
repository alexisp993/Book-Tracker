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
import { Card } from "@/components/ui/card";
import { ListContainer, ListRow } from "@/components/ui/list";

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
      {/* The identity block is this page's masthead, not a liftable object, so
          it isn't boxed — the name reads at title scale, as a name should. */}
      <div className="flex items-center gap-4 pb-2">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {me?.name ? (
              <h1 className="truncate font-display text-2xl font-semibold leading-tight tracking-tight">
                {me.name}
              </h1>
            ) : null}
            {me?.isAdmin ? (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-caption-sm font-medium text-violet-600 dark:text-violet-300">
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
      <ListContainer>
        {MENU_ITEMS.map((item) => (
          <ListRow
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </ListContainer>
    </div>
  );
}
