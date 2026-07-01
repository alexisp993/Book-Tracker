import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/prisma";
import type { HomeSection } from "@/lib/homeConfig";
import { DEFAULT_HOME_CONFIG, validateHomeConfig } from "@/lib/homeConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { homeConfig: true },
  });

  let config: HomeSection[];
  if (dbUser?.homeConfig) {
    try {
      const parsed = JSON.parse(dbUser.homeConfig) as unknown;
      config = validateHomeConfig(parsed);
    } catch {
      config = DEFAULT_HOME_CONFIG;
    }
  } else {
    config = DEFAULT_HOME_CONFIG;
  }

  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const config = validateHomeConfig(json);
  if (!config) {
    return NextResponse.json({ error: "Invalid config format" }, { status: 422 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { homeConfig: JSON.stringify(config) },
  });

  return NextResponse.json(config);
}
