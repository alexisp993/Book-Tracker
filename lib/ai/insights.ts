import { prisma } from "@/lib/prisma";
import type { InsightContext, ReadingInsight } from "@/lib/ai/types";

/**
 * Reading insights.
 *
 * STUB (this phase): computes a couple of simple, real metrics directly from the
 * database so the panel shows something truthful. No model call yet.
 *
 * TODO: wire Claude API. A later phase will pass aggregated stats to the model
 * and ask for natural-language observations and suggested goals, returning
 * ReadingInsight[]. Keep this signature stable.
 */
export async function getInsights(
  ctx: InsightContext,
): Promise<ReadingInsight[]> {
  const [readCount, total] = await Promise.all([
    prisma.userBook.count({ where: { userId: ctx.userId, status: "READ" } }),
    prisma.userBook.count({ where: { userId: ctx.userId } }),
  ]);

  const insights: ReadingInsight[] = [];

  insights.push({
    key: "library_size",
    headline: `${total} book${total === 1 ? "" : "s"} in your library`,
    detail:
      total === 0
        ? "Add your first book to start tracking your reading."
        : `${readCount} marked as read so far.`,
  });

  if (total > 0) {
    insights.push({
      key: "ai_coming_soon",
      headline: "Personalized insights coming soon",
      detail:
        "Once enough reading history is logged, AI-generated insights about your pace, genres, and habits will appear here.",
    });
  }

  return insights;
}
