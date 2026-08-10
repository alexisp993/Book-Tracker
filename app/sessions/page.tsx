import { PageHeader } from "@/components/ui/page-header";
import { SessionHistoryView } from "@/components/SessionHistoryView";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        subtitle="Every sitting you’ve logged — how long, how far, and how it felt."
      />
      <SessionHistoryView />
    </div>
  );
}
