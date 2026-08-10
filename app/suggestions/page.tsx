import { PageHeader } from "@/components/ui/page-header";
import { SuggestionSection } from "@/components/SuggestionSection";

// Suggestions takes the nav slot Collections used to hold. It was previously
// buried at the bottom of the Collections page, below a grid most readers
// never scrolled past — which is a strange place for the one screen whose job
// is "what should I read next?".
export default function SuggestionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="What to read next"
        subtitle="Scored against what you've read and rated. Read the blurb first, then decide."
      />
      <SuggestionSection />
    </div>
  );
}
