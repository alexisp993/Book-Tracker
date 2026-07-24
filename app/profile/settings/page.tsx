import { ProfileSettingsView } from "@/components/ProfileSettingsView";

export default function ProfileSettingsPage() {
  // Same cap as /profile so the width doesn't jump between the menu
  // and its subpages.
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ProfileSettingsView />
    </div>
  );
}
