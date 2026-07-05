"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Pencil, ScanBarcode, Search } from "lucide-react";

interface LauncherOption {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function OptionCard({ icon, title, subtitle, onClick }: LauncherOption) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-secondary"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// The chooser screen shown before actually adding a book — Scan and Add
// Manually hand off to Library's existing dialogs via query params
// (?scan=1 / ?add=1); Search Books has no backend yet (only single-ISBN
// lookup exists), so it's an honest placeholder rather than fake results.
export function AddBookLauncher() {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/library")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </button>

      <h1 className="font-display text-2xl font-bold tracking-tight">Add a Book</h1>

      <div className="space-y-3">
        <OptionCard
          icon={<ScanBarcode className="h-5 w-5" />}
          title="Scan Barcode"
          subtitle="Use camera to scan book barcode"
          onClick={() => router.push("/library?scan=1")}
        />
        <OptionCard
          icon={<Search className="h-5 w-5" />}
          title="Search Books"
          subtitle="Search by title, author, or ISBN"
          onClick={() => setSearchOpen((v) => !v)}
        />
        {searchOpen ? (
          <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            Title and author search is coming soon. For now, try{" "}
            <button
              type="button"
              onClick={() => router.push("/library?scan=1")}
              className="font-medium text-foreground underline"
            >
              Scan Barcode
            </button>{" "}
            or{" "}
            <button
              type="button"
              onClick={() => router.push("/library?add=1")}
              className="font-medium text-foreground underline"
            >
              add manually
            </button>
            .
          </div>
        ) : null}
        <OptionCard
          icon={<Pencil className="h-5 w-5" />}
          title="Add Manually"
          subtitle="Enter book details manually"
          onClick={() => router.push("/library?add=1")}
        />
      </div>
    </div>
  );
}
