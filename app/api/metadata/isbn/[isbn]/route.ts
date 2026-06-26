import { NextResponse } from "next/server";
import { findLocalBook, lookupByIsbn } from "@/lib/metadata";
import { isValidIsbn, normalizeIsbn } from "@/lib/isbn";

export const dynamic = "force-dynamic";

// GET /api/metadata/isbn/:isbn — resolve book metadata for a scanned/typed ISBN.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isbn: string }> },
) {
  const { isbn: raw } = await params;
  const isbn = normalizeIsbn(raw ?? "");

  if (!isValidIsbn(isbn)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid ISBN-10 or ISBN-13." },
      { status: 400 },
    );
  }

  // Cache-first: a book already in the local database (e.g. owned by any
  // user, or scanned before) resolves with a single indexed read and zero
  // external calls — only a genuine miss falls through to the 3 providers.
  const metadata = (await findLocalBook(isbn)) ?? (await lookupByIsbn(isbn));
  if (!metadata) {
    return NextResponse.json(
      {
        error:
          "No book found for that ISBN. You can still add it manually.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(metadata);
}
