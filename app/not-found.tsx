import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

// Renders inside the normal AppShell (the root layout wraps every route in
// it), so this is only ever reached by an already-authenticated reader who
// followed a stale link or mistyped a URL — middleware sends anyone signed
// out to /login first. A missing book has its own inline "Book not found"
// state in BookDetailView; this is for routes that don't exist at all.
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={Compass}
        title="This page doesn't exist"
        description="The page you're looking for isn't here. It may have moved, or the link might be out of date."
        action={
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to Home
          </Link>
        }
      />
    </div>
  );
}
