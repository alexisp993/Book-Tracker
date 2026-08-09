import { PageHeader } from "@/components/ui/page-header";
import { GroupsView } from "@/components/GroupsView";
import { SuggestionSection } from "@/components/SuggestionSection";

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        // Paired with the Shelves subtitle so the two screens explain each
        // other. Collections keep an order (CollectionBook.order); shelves
        // don't. That is the whole distinction, and neither screen said it.
        subtitle="Ordered sets — a series, a reading order, a list you want kept in sequence."
      />
      <GroupsView base="collections" singular="collection" />
      <SuggestionSection />
    </div>
  );
}
