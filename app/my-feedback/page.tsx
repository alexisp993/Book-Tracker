import { PageHeader } from "@/components/ui/page-header";
import { MyFeedbackView } from "@/components/MyFeedbackView";

export default function MyFeedbackPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="My Feedback"
        subtitle="Everything you’ve sent in, and where it stands."
      />
      <MyFeedbackView />
    </div>
  );
}
