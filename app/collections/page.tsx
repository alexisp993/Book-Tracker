import { GroupsView } from "@/components/GroupsView";
import { SuggestionSection } from "@/components/SuggestionSection";

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Collections
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Curated lists — favorites, best of the year, books to buy.
        </p>
      </div>
      <GroupsView base="collections" singular="collection" />
      <SuggestionSection />
    </div>
  );
}
