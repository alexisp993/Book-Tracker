import { PageHeader } from "@/components/ui/page-header";
import { CalendarView } from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    // Capped here rather than only inside CalendarView, so the heading shares
    // the calendar's left edge instead of stranding it against the far left of
    // the full-width shell.
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Reading Calendar"
        subtitle="A month-by-month view of your reading sessions."
      />
      <CalendarView />
    </div>
  );
}
