import { PageHeader } from "@/components/ui/page-header";
import { GroupsView } from "@/components/GroupsView";

export default function ShelvesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelves"
        // The subtitle's job is to distinguish this from Collections, which
        // was previously impossible from either screen — same layout, same
        // empty state, interchangeable copy. A shelf is an unordered group;
        // a collection is a sequence. Say so.
        subtitle="Loose groups — by genre, by mood, by anything. Order doesn't matter here."
      />
      <GroupsView base="shelves" singular="shelf" />
    </div>
  );
}
