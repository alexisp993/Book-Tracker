"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Shared back-chevron + title header for the standalone pages a Profile
// menu row navigates to — mirrors the back-navigation pattern already used
// by AddBookLauncher.tsx / SearchResultsView.tsx.
export function ProfileSubpageHeader({ title }: { title?: string }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.push("/profile")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </button>

      {title ? (
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      ) : null}
    </div>
  );
}
