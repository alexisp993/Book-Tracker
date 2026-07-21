import { PageHeader } from "@/components/ui/page-header";
import { SessionHistoryView } from "@/components/SessionHistoryView";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Every reading session you’ve logged, with mood and notes."
      />
      <SessionHistoryView />
    </div>
  );
}
