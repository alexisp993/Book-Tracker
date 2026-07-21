import { PageHeader } from "@/components/ui/page-header";
import { GroupsView } from "@/components/GroupsView";
import { SuggestionSection } from "@/components/SuggestionSection";

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        subtitle="Curated lists — favorites, best of the year, books to buy."
      />
      <GroupsView base="collections" singular="collection" />
      <SuggestionSection />
    </div>
  );
}
