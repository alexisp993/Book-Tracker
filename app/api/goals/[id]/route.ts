import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema } from "@/lib/validation";
import type { GoalDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

async function booksReadInYear(userId: string, year: number): Promise<number> {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  return prisma.userBook.count({
    where: {
      userId,
      status: "READ",
      finishDate: { gte: start, lt: end },
    },
  });
}

export async function PATCH(
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
  const parsed = updateGoalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const g = await prisma.goal.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.type !== undefined && { type: parsed.data.type }),
      ...(parsed.data.target !== undefined && { target: parsed.data.target }),
      ...(parsed.data.year !== undefined && { year: parsed.data.year }),
      ...(parsed.data.metaKey !== undefined && { metaKey: parsed.data.metaKey }),
      ...(parsed.data.metaValue !== undefined && { metaValue: parsed.data.metaValue }),
    },
  });

  const year = g.year ?? new Date().getFullYear();
  const booksRead = g.type === "BOOKS" ? await booksReadInYear(user.id, year) : 0;

  const dto: GoalDTO = {
    id: g.id,
    title: g.title,
    type: g.type,
    target: g.target,
    year: g.year,
    metaKey: g.metaKey,
    metaValue: g.metaValue,
    createdAt: g.createdAt.toISOString(),
    progress: booksRead,
  };

  return NextResponse.json(dto);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.goal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
