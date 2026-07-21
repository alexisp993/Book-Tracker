import { PageHeader } from "@/components/ui/page-header";
import { FeedbackForm } from "@/components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="Found a bug, have an idea, or just want to say hi? We’d love to hear it."
      />
      <FeedbackForm />
    </div>
  );
}
