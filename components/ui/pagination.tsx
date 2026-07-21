"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Previously copy-pasted verbatim in Library, Sessions, and Admin Feedback.
// Renders nothing for a single page so callers don't need to guard.
export function Pagination({
  page,
  totalPages,
  onChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1 || disabled}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages || disabled}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
