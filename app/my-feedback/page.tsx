import { MyFeedbackView } from "@/components/MyFeedbackView";

export default function MyFeedbackPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          My Feedback
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you&rsquo;ve sent in, and where it stands.
        </p>
      </div>
      <MyFeedbackView />
    </div>
  );
}
