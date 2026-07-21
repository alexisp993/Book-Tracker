import { PageHeader } from "@/components/ui/page-header";
import { CalendarView } from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reading Calendar"
        subtitle="A month-by-month view of your reading sessions."
      />
      <CalendarView />
    </div>
  );
}
