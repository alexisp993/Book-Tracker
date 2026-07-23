import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// One calm loading treatment for the whole app — a centred, muted spinner
// (replaces the scattered raw "Loading…" text so every screen resolves the
// same way).
export function Loading({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}
