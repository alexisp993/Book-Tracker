import { redirect } from "next/navigation";
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
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Beta Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A lightweight snapshot of how the beta is going.
        </p>
      </div>
      <BetaDashboardView />
    </div>
  );
}
