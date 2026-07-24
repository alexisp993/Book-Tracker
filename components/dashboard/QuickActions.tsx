"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ScanBarcode, Search, Shuffle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useBooks } from "@/lib/queries";

// Four quick-action tiles. Random Book has no backend, but it's a genuine
// client-side pick — a random book from the library, opened directly — not a
// fabricated feature.
export function QuickActions() {
  const router = useRouter();
  // A modest page is plenty to pick from; the button is disabled until loaded.
  const { data } = useBooks({ pageSize: 50 });
  const books = data?.items ?? [];

  function openRandom() {
    if (books.length === 0) return;
    const pick = books[Math.floor(Math.random() * books.length)];
    router.push(`/books/${pick.id}`);
  }

  return (
    <Card title="Quick Actions" className="h-full">
      <div className="grid grid-cols-2 gap-3">
        <Tile href="/library/search" icon={<Search className="h-5 w-5" />} label="Search Books" tint="blue" />
        <Tile href="/library?scan=1" icon={<ScanBarcode className="h-5 w-5" />} label="Scan Barcode" tint="teal" />
        <Tile href="/library/add" icon={<Plus className="h-5 w-5" />} label="Add Book" tint="amber" />
        <button
          type="button"
          onClick={openRandom}
          disabled={books.length === 0}
          className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center shadow-card transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-secondary hover:shadow-card-hover disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300">
            <Shuffle className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium">Random Book</span>
        </button>
      </div>
    </Card>
  );
}

const TINTS: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

function Tile({
  href,
  icon,
  label,
  tint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  tint: keyof typeof TINTS;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center shadow-card transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-secondary hover:shadow-card-hover"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${TINTS[tint]}`}>
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
