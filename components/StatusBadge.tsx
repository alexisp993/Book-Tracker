import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES, type ReadingStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
