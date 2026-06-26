import { FeedbackForm } from "@/components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Feedback
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Found a bug, have an idea, or just want to say hi? We&rsquo;d love
          to hear it.
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}
