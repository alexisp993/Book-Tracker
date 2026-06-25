import { NextResponse } from "next/server";
import { lookupByIsbn } from "@/lib/metadata";
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

  const metadata = await lookupByIsbn(isbn);
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
