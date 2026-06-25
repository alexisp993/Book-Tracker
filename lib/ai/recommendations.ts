import { prisma } from "@/lib/prisma";
import type {
  BookRecommendation,
  RecommendationContext,
} from "@/lib/ai/types";

/**
 * Smart recommendations.
 *
 * STUB (this phase): returns deterministic placeholder suggestions derived from
 * the user's highest-rated books so the UI and API can be built and tested
 * without an API key.
 *
 * TODO: wire Claude API. Replace the body below with a call that:
 *   1. summarizes the user's library (genres, authors, ratings, pace) into a prompt,
 *   2. calls the Anthropic API (model `claude-opus-4-8`, or a cheaper model for
 *      bulk/background runs), requesting structured JSON matching BookRecommendation[],
 *   3. validates the response with Zod before returning.
 * Keep this function's signature and return type unchanged.
 */
export async function getRecommendations(
  ctx: RecommendationContext,
): Promise<BookRecommendation[]> {
  const topRated = await prisma.userBook.findMany({
    where: { userId: ctx.userId, rating: { gte: 4 } },
    include: { book: { include: { authors: { include: { author: true } } } } },
    take: 3,
    orderBy: { rating: "desc" },
  });

  if (topRated.length === 0) {
    return [
      {
        title: "Project Hail Mary",
        author: "Andy Weir",
        reason:
          "A widely loved entry point — rate a few books and recommendations will adapt to your taste.",
        confidence: 0.4,
      },
    ];
  }

  return topRated.map((ub) => {
    const author =
      ub.book.authors[0]?.author.name ?? "an author you've enjoyed";
    return {
      title: `More like “${ub.book.title}”`,
      author,
      reason: `You rated “${ub.book.title}” ${ub.rating}/5. (Stubbed — live AI suggestions arrive in a later phase.)`,
      confidence: 0.5,
    };
  });
}
