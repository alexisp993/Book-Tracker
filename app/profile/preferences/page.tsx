import { ProfilePreferencesView } from "@/components/ProfilePreferencesView";

export default function ProfilePreferencesPage() {
  // Same cap as /profile so the width doesn't jump between the menu
  // and its subpages.
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ProfilePreferencesView />
    </div>
  );
}
