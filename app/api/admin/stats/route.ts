import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrResponse } from "@/lib/user";
import { MAX_BETA_USERS } from "@/lib/constants";
import type { BetaStats } from "@/lib/types";

export const dynamic = "force-dynamic";

// GET /api/admin/stats — lightweight beta-health dashboard. Admin-only.
// Every number is a cheap, indexed count/groupBy — no full-table fetch +
// JS-loop aggregation, same discipline as the existing /api/stats rewrite.
export async function GET() {
  const admin = await requireAdminOrResponse();
  if (admin instanceof NextResponse) return admin;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalBooks,
    booksThisWeek,
    typeGroups,
    statusGroups,
    topFeatureRequests,
    topBugs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.book.count(),
    prisma.book.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.feedback.groupBy({ by: ["type"], _count: true }),
    prisma.feedback.groupBy({ by: ["status"], _count: true }),
    prisma.feedback.groupBy({
      by: ["subject"],
      where: { type: "FEATURE_REQUEST" },
      _count: { subject: true },
      orderBy: { _count: { subject: "desc" } },
      take: 5,
    }),
    prisma.feedback.groupBy({
      by: ["subject"],
      where: { type: "BUG" },
      _count: { subject: true },
      orderBy: { _count: { subject: "desc" } },
      take: 5,
    }),
  ]);

  const byType: Record<string, number> = { BUG: 0, FEATURE_REQUEST: 0, GENERAL: 0 };
  let totalFeedback = 0;
  for (const g of typeGroups) {
    byType[g.type] = g._count;
    totalFeedback += g._count;
  }
  const byStatus: Record<string, number> = {};
  for (const g of statusGroups) byStatus[g.status] = g._count;

  const stats: BetaStats = {
    totalUsers,
    remainingSlots: Math.max(0, MAX_BETA_USERS - totalUsers),
    maxBetaUsers: MAX_BETA_USERS,
    totalBooks,
    booksThisWeek,
    totalFeedback,
    bugReports: byType.BUG ?? 0,
    featureRequests: byType.FEATURE_REQUEST ?? 0,
    generalFeedback: byType.GENERAL ?? 0,
    feedbackByStatus: byStatus,
    mostRequestedFeatures: topFeatureRequests.map((g) => ({
      subject: g.subject,
      count: g._count.subject,
    })),
    mostCommonBugs: topBugs.map((g) => ({
      subject: g.subject,
      count: g._count.subject,
    })),
  };

  return NextResponse.json(stats);
}
