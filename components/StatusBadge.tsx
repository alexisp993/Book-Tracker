import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES, type ReadingStatus } from "@/lib/constants";

// `overlay`: use a neutral frosted-glass background (keeping the status's
// tinted text color) instead of the tinted background, for placement on top
// of a book cover image where the tint's low opacity wouldn't guarantee
// legible contrast against an arbitrary cover.
export function StatusBadge({
  status,
  overlay = false,
  className,
}: {
  status: ReadingStatus;
  overlay?: boolean;
  className?: string;
}) {
  const textColor = STATUS_STYLES[status].replace(/bg-\S+/, "");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        overlay ? "bg-background/75 shadow-sm backdrop-blur-md" : STATUS_STYLES[status],
        overlay ? textColor : "",
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
