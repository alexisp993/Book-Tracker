import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/metadata";

export const dynamic = "force-dynamic";

// GET /api/metadata/search?q= — free-text title/author search for Add a
// Book's "Search Books" flow. Mirrors the ISBN route's conventions: a
// missing/short query is a normal empty state, not an error.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchBooks(q);
  return NextResponse.json({ results });
}
