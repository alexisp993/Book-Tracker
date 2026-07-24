import { ProfileBackupView } from "@/components/ProfileBackupView";

export default function ProfileBackupPage() {
  // Same cap as /profile so the width doesn't jump between the menu
  // and its subpages.
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ProfileBackupView />
    </div>
  );
}
