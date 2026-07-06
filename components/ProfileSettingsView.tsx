"use client";

import type * as React from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { ProfileSubpageHeader } from "@/components/ProfileSubpageHeader";
import { useCurrentUser } from "@/lib/queries";

export function ProfileSettingsView() {
  const { data: me } = useCurrentUser();

  return (
    <div className="space-y-6">
      <ProfileSubpageHeader title="Settings" />

      {me?.isAdmin ? (
        <div className="overflow-hidden rounded-xl border bg-card divide-y divide-border/60">
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
        </div>
      ) : null}

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </form>
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
