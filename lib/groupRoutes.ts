import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import {
  createGroup,
  deleteGroup,
  getGroupWithBooks,
  listGroups,
  updateGroup,
  type GroupKind,
} from "@/lib/groups";
import { groupCreateSchema, groupUpdateSchema } from "@/lib/validation";

// Factory that builds the REST handlers for a group kind (shelf | collection).
export function listHandlers(kind: GroupKind) {
  async function GET() {
    const user = await getCurrentUser();
    return NextResponse.json(await listGroups(user.id, kind));
  }

  async function POST(request: Request) {
    const user = await getCurrentUser();
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = groupCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }
    try {
      const group = await createGroup(
        user.id,
        kind,
        parsed.data.name,
        parsed.data.description,
      );
      return NextResponse.json(group, { status: 201 });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2002"
      ) {
        return NextResponse.json(
          { error: `You already have a ${kind} with that name.` },
          { status: 409 },
        );
      }
      throw err;
    }
  }

  return { GET, POST };
}

export function itemHandlers(kind: GroupKind) {
  async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const user = await getCurrentUser();
    const { id } = await params;
    const result = await getGroupWithBooks(user.id, kind, id);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const user = await getCurrentUser();
    const { id } = await params;
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = groupUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }
    const group = await updateGroup(user.id, kind, id, parsed.data);
    if (!group) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(group);
  }

  async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const user = await getCurrentUser();
    const { id } = await params;
    const ok = await deleteGroup(user.id, kind, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  }

  return { GET, PATCH, DELETE };
}
