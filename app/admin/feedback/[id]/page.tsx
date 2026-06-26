import { redirect } from "next/navigation";
import { AdminFeedbackDetail } from "@/components/AdminFeedbackDetail";
import { requireAdmin, UnauthorizedError } from "@/lib/user";

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/");
    throw err;
  }

  const { id } = await params;

  return (
    <div className="space-y-6">
      <AdminFeedbackDetail id={id} />
    </div>
  );
}
