import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AdminFeedbackView } from "@/components/AdminFeedbackView";
import { requireAdmin, UnauthorizedError } from "@/lib/user";

export default async function AdminFeedbackPage() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/");
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin · Feedback"
        subtitle="All beta tester feedback, across every user."
      />
      <AdminFeedbackView />
    </div>
  );
}
