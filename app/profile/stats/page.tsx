import { BackHeader } from "@/components/ui/page-header";
import { StatsView } from "@/components/StatsView";

export default function ProfileStatsPage() {
  return (
    <div className="space-y-6">
      <BackHeader href="/profile" backLabel="Back to Profile" />
      <StatsView />
    </div>
  );
}
