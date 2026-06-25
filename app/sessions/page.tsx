import { SessionHistoryView } from "@/components/SessionHistoryView";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Sessions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every reading session you&rsquo;ve logged, with mood and notes.
        </p>
      </div>
      <SessionHistoryView />
    </div>
  );
}
