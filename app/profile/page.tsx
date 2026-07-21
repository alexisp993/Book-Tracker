import { PageHeader } from "@/components/ui/page-header";
import { ProfileView } from "@/components/ProfileView";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" subtitle="Your reading life at a glance." />
      <ProfileView />
    </div>
  );
}
