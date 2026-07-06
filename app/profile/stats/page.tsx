import { ProfileSubpageHeader } from "@/components/ProfileSubpageHeader";
import { StatsView } from "@/components/StatsView";

export default function ProfileStatsPage() {
  return (
    <div className="space-y-6">
      <ProfileSubpageHeader />
      <StatsView />
    </div>
  );
}
