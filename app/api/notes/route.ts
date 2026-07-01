import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { createNote, listNotes, NoteError } from "@/lib/notes";
import { createNoteSchema, listNotesQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const parsed = listNotesQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const result = await listNotes(user.id, parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createNoteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const note = await createNote(user.id, parsed.data);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    if (err instanceof NoteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
