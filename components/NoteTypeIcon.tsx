import { Bookmark, Highlighter, Lightbulb, Quote, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NoteType } from "@/lib/constants";

// Lucide equivalents of the note-type emoji this replaced (🌟💬💭⭐🔖).
// Design system §4.7: SVG icons only, never emoji as UI — emoji render
// inconsistently across platforms and can't inherit colour or size.
// Lives in a component file rather than lib/constants.ts so the icon set
// isn't pulled into server-only imports of that module.
export const NOTE_TYPE_ICON: Record<NoteType, LucideIcon> = {
  HIGHLIGHT: Highlighter,
  QUOTE: Quote,
  THOUGHT: Lightbulb,
  REVIEW: Star,
  BOOKMARK: Bookmark,
};

export function NoteTypeIcon({
  type,
  className = "h-3.5 w-3.5",
}: {
  type: NoteType;
  className?: string;
}) {
  const Icon = NOTE_TYPE_ICON[type];
  return <Icon className={className} aria-hidden />;
}
