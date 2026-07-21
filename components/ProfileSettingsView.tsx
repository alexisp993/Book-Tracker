"use client";

import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { BackHeader } from "@/components/ui/page-header";
import { ListContainer, ListRow } from "@/components/ui/list";
import { useCurrentUser } from "@/lib/queries";

export function ProfileSettingsView() {
  const { data: me } = useCurrentUser();

  return (
    <div className="space-y-6">
      <BackHeader href="/profile" backLabel="Back to Profile" title="Settings" />

      {me?.isAdmin ? (
        <ListContainer>
          <ListRow
            href="/admin/dashboard"
            icon={LayoutDashboard}
            label="Beta Dashboard"
            description="Usage stats and health metrics"
          />
          <ListRow
            href="/admin/feedback"
            icon={ShieldCheck}
            label="Admin Feedback"
            description="Review all user feedback"
          />
        </ListContainer>
      ) : null}

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </form>
    </div>
  );
}
