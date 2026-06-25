import { BookMarked, LogOut } from "lucide-react";
import { LibraryView } from "@/components/LibraryView";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookMarked className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Book Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Your unlimited personal library
          </p>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </header>

      <LibraryView />
    </main>
  );
}
