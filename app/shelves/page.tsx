import { PageHeader } from "@/components/ui/page-header";
import { GroupsView } from "@/components/GroupsView";

export default function ShelvesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelves"
        subtitle="Organize your library by genre, mood, or anything you like."
      />
      <GroupsView base="shelves" singular="shelf" />
    </div>
  );
}
