import { prisma } from "@/lib/prisma";

export interface SuggestionDTO {
  id: string; // UserBook id
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  reasons: string[];
  score: number;
}

// Heuristic book recommender that scores WANT_TO_READ books in the user's
// library against their reading history — no AI, no external calls.
//
// Scoring weights:
//   +40  genre matches one of user's top-3 genres
//   +30  author matches a previously-read author
//   +20  user rated another book by this author 4 or 5 stars
//   +10  series continuation (user started this series)
//   -10  user DNF'd another book in this series
export async function getSuggestions(userId: string): Promise<SuggestionDTO[]> {
  const [wantToRead, doneBooks] = await Promise.all([
    // Candidate books: everything in the TBR pile
    prisma.userBook.findMany({
      where: { userId, status: "WANT_TO_READ" },
      include: {
        book: {
          include: {
            authors: { include: { author: { select: { name: true } } } },
            genres: { include: { genre: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Profile source: books the user has engaged with (any terminal status)
    prisma.userBook.findMany({
      where: { userId, status: { in: ["READ", "CURRENTLY_READING", "DID_NOT_FINISH"] } },
      include: {
        book: {
          include: {
            authors: { include: { author: { select: { name: true } } } },
            genres: { include: { genre: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  if (wantToRead.length === 0) return [];

  // Build user profile from books they've read or are reading
  const genreFreq = new Map<string, number>();
  const readAuthors = new Set<string>();
  const highRatedAuthors = new Set<string>(); // rated ≥ 4 by user
  const startedSeriesIds = new Set<string>();
  const dnfSeriesIds = new Set<string>();

  for (const ub of doneBooks) {
    const genres = ub.book.genres.map((g) => g.genre.name);
    const authors = ub.book.authors
      .sort((a, b) => a.order - b.order)
      .map((a) => a.author.name);

    if (ub.status === "READ" || ub.status === "CURRENTLY_READING") {
      for (const g of genres) genreFreq.set(g, (genreFreq.get(g) ?? 0) + 1);
      for (const a of authors) readAuthors.add(a);
      if (ub.rating !== null && ub.rating >= 4) {
        for (const a of authors) highRatedAuthors.add(a);
      }
      if (ub.book.seriesId) startedSeriesIds.add(ub.book.seriesId);
    } else if (ub.status === "DID_NOT_FINISH") {
      if (ub.book.seriesId) dnfSeriesIds.add(ub.book.seriesId);
    }
  }

  // Top-3 genres by frequency
  const top3Genres = new Set(
    [...genreFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g),
  );

  // Score each WANT_TO_READ book
  const scored: SuggestionDTO[] = wantToRead.map((ub) => {
    const genres = ub.book.genres.map((g) => g.genre.name);
    const authors = ub.book.authors
      .sort((a, b) => a.order - b.order)
      .map((a) => a.author.name);

    let score = 0;
    const reasons: string[] = [];

    // Genre match (+40)
    const matchedGenres = genres.filter((g) => top3Genres.has(g));
    if (matchedGenres.length > 0) {
      score += 40;
      reasons.push(
        matchedGenres.length === 1
          ? `Because you read ${matchedGenres[0]}`
          : `Matches your top genres`,
      );
    }

    // Read author (+30)
    const knownAuthors = authors.filter((a) => readAuthors.has(a));
    if (knownAuthors.length > 0) {
      score += 30;
      reasons.push(`By ${knownAuthors[0]}${knownAuthors.length > 1 ? " and others" : ""}, an author you've read`);
    }

    // High-rated author (+20)
    const highRatedMatch = authors.some((a) => highRatedAuthors.has(a));
    if (highRatedMatch && !knownAuthors.length) {
      // Only add if not already in the "read author" bucket (avoid duplicate)
      score += 20;
      reasons.push("By a highly-rated author");
    } else if (highRatedMatch) {
      score += 20;
    }

    // Series continuation (+10)
    if (ub.book.seriesId && startedSeriesIds.has(ub.book.seriesId)) {
      score += 10;
      reasons.push("Next in a series you started");
    }

    // DNF series penalty (-10)
    if (ub.book.seriesId && dnfSeriesIds.has(ub.book.seriesId)) {
      score -= 10;
    }

    return {
      id: ub.id,
      bookId: ub.bookId,
      title: ub.book.title,
      authors,
      coverUrl: ub.book.coverUrl,
      reasons,
      score,
    };
  });

  // Return top 10 with at least one reason (scored books first, then the rest)
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.reasons.length > 0)
    .slice(0, 10);
}
