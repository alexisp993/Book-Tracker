import { CalendarView } from "@/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Reading Calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A month-by-month view of your reading sessions.
        </p>
      </div>
      <CalendarView />
    </div>
  );
}
