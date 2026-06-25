import { StatsView } from "@/components/StatsView";

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Stats
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your reading at a glance.
        </p>
      </div>
      <StatsView />
    </div>
  );
}
