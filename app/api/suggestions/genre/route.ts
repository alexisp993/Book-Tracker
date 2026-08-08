import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { getGenreSuggestions } from "@/lib/suggestions";
import { SUGGESTION_GENRES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/suggestions/genre?genre= — external discovery for the "By Genre"
// suggestions mode, scored against the user's reading history (see
// lib/suggestions.ts's getGenreSuggestions), distinct from the purely
// library-scored /api/suggestions. Mirrors /api/metadata/search's
// convention: an empty/unrecognized genre is a normal empty state, not an
// error.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "";

  if (!SUGGESTION_GENRES.includes(genre as (typeof SUGGESTION_GENRES)[number])) {
    return NextResponse.json({ results: [], providerCount: 0 });
  }

  const user = await getCurrentUser();
  const { results, providerCount } = await getGenreSuggestions(user.id, genre);

  return NextResponse.json({ results, providerCount });
}
