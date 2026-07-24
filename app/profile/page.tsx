import { PageHeader } from "@/components/ui/page-header";
import { ProfileView } from "@/components/ProfileView";

export default function ProfilePage() {
  return (
    // A settings menu, not a dashboard — capped so a row's label and its
    // chevron aren't 1200px apart in the full-width shell.
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Profile" subtitle="Your reading life at a glance." />
      <ProfileView />
    </div>
  );
}
