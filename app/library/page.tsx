import { LibraryView } from "@/components/LibraryView";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Library
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&rsquo;re reading, want to read, and have read.
        </p>
      </div>
      <LibraryView />
    </div>
  );
}
