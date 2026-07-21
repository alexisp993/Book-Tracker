import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { BetaDashboardView } from "@/components/BetaDashboardView";
import { requireAdmin, UnauthorizedError } from "@/lib/user";

export default async function AdminDashboardPage() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/");
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Beta Dashboard"
        subtitle="A lightweight snapshot of how the beta is going."
      />
      <BetaDashboardView />
    </div>
  );
}
