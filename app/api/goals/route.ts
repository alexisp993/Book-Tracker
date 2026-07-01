import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import { createGoalSchema } from "@/lib/validation";
import type { GoalDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

function computeProgress(goal: {
  type: string;
  year: number | null;
  metaKey: string | null;
  metaValue: string | null;
  booksRead: number;
}): number {
  if (goal.type === "BOOKS") return goal.booksRead;
  return 0;
}

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

export async function GET() {
  const user = await getCurrentUser();
  const currentYear = new Date().getFullYear();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const result: GoalDTO[] = await Promise.all(
    goals.map(async (g) => {
      const year = g.year ?? currentYear;
      const booksRead =
        g.type === "BOOKS" ? await booksReadInYear(user.id, year) : 0;
      return {
        id: g.id,
        title: g.title,
        type: g.type,
        target: g.target,
        year: g.year,
        metaKey: g.metaKey,
        metaValue: g.metaValue,
        createdAt: g.createdAt.toISOString(),
        progress: computeProgress({ ...g, booksRead }),
      };
    }),
  );

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
  const parsed = createGoalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const g = await prisma.goal.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      target: parsed.data.target,
      year: parsed.data.year ?? new Date().getFullYear(),
      metaKey: parsed.data.metaKey ?? null,
      metaValue: parsed.data.metaValue ?? null,
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

  return NextResponse.json(dto, { status: 201 });
}
