import { BackHeader } from "@/components/ui/page-header";
import { ReadingGoalCard } from "@/components/ReadingGoalCard";

export default function ProfileGoalsPage() {
  return (
    <div className="space-y-6">
      <BackHeader href="/profile" backLabel="Back to Profile" title="Reading Goals" />
      <ReadingGoalCard />
    </div>
  );
}
