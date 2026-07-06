import { ProfileSubpageHeader } from "@/components/ProfileSubpageHeader";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";

export default function ProfileGoalsPage() {
  return (
    <div className="space-y-6">
      <ProfileSubpageHeader title="Reading Goals" />
      <ReadingGoalCard />
    </div>
  );
}
