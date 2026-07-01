import { NotesView } from "@/components/NotesView";

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Notes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your reading notebook — highlights, quotes, and thoughts.
        </p>
      </div>
      <NotesView />
    </div>
  );
}
