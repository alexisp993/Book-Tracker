import { redirect } from "next/navigation";
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
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Admin · Feedback
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All beta tester feedback, across every user.
        </p>
      </div>
      <AdminFeedbackView />
    </div>
  );
}
