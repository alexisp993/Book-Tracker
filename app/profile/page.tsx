import { ProfileView } from "@/components/ProfileView";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your reading life at a glance.
        </p>
      </div>
      <ProfileView />
    </div>
  );
}
