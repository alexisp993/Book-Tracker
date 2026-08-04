import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { searchBooksByGenre } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { SUGGESTION_GENRES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/suggestions/genre?genre= — external discovery for the "By Genre"
// suggestions mode, distinct from the library-scored /api/suggestions.
// Mirrors /api/metadata/search's convention: an empty/unrecognized genre is
// a normal empty state, not an error.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre = searchParams.get("genre") ?? "";

  if (!SUGGESTION_GENRES.includes(genre as (typeof SUGGESTION_GENRES)[number])) {
    return NextResponse.json({ results: [] });
  }

  const user = await getCurrentUser();
  const [results, owned] = await Promise.all([
    searchBooksByGenre(genre),
    prisma.book.findMany({
      where: { userBooks: { some: { userId: user.id } } },
      select: { isbn13: true },
    }),
  ]);

  const ownedIsbns = new Set(owned.map((b) => b.isbn13).filter((isbn): isbn is string => !!isbn));
  const filtered = results.filter((r) => !r.isbn13 || !ownedIsbns.has(r.isbn13));

  return NextResponse.json({ results: filtered });
}
