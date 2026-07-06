"use client";

import type * as React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { ProfileSubpageHeader } from "@/components/ProfileSubpageHeader";

export function ProfileHelpView() {
  return (
    <div className="space-y-6">
      <ProfileSubpageHeader title="Help & Support" />

      <div className="overflow-hidden rounded-xl border bg-card divide-y divide-border/60">
        <HelpLink
          href="/feedback"
          icon={<MessageSquare className="h-4 w-4" />}
          label="Send Feedback"
          description="Report a bug or request a feature"
        />
        <HelpLink
          href="/my-feedback"
          icon={<MessageSquare className="h-4 w-4" />}
          label="My Feedback"
          description="View your submitted feedback"
        />
      </div>
    </div>
  );
}

function HelpLink({
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
