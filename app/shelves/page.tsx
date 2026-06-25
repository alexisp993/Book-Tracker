import { GroupsView } from "@/components/GroupsView";

export default function ShelvesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Shelves
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your library by genre, mood, or anything you like.
        </p>
      </div>
      <GroupsView base="shelves" singular="shelf" />
    </div>
  );
}
