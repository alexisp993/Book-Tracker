import { prisma } from "@/lib/prisma";
import { searchBooksByGenre, type BookSearchResult } from "@/lib/metadata";

export interface SuggestionDTO {
  id: string; // UserBook id
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  description: string | null;
  reasons: string[];
  score: number;
}

export interface GenreSuggestionItem extends BookSearchResult {
  reasons: string[];
  score: number;
}

export interface GenreSuggestionResult {
  results: GenreSuggestionItem[];
  /**
   * How many raw records the metadata providers returned, before the
   * already-owned filter. Zero means the providers themselves came back
   * empty (outage, rate limit, or a genuinely unmatched genre); a positive
   * count with an empty `results` means the reader already owns everything
   * we found. The UI needs to say different things in those two cases.
   */
  providerCount: number;
}

interface UserTasteProfile {
  top3Genres: Set<string>;
  readAuthors: Set<string>;
  highRatedAuthors: Set<string>; // rated ≥ 4 by user
  startedSeriesIds: Set<string>;
  dnfSeriesIds: Set<string>;
}

// Shared by getSuggestions and getGenreSuggestions — built from books the
// user has actually engaged with (any terminal status), independent of
// whichever candidate pool (library TBR vs. external genre search) is being
// scored against it.
async function buildUserProfile(userId: string): Promise<UserTasteProfile> {
  const doneBooks = await prisma.userBook.findMany({
    where: { userId, status: { in: ["READ", "CURRENTLY_READING", "DID_NOT_FINISH"] } },
    include: {
      book: {
        include: {
          authors: { include: { author: { select: { name: true } } } },
          genres: { include: { genre: { select: { name: true } } } },
        },
      },
    },
  });

  const genreFreq = new Map<string, number>();
  const readAuthors = new Set<string>();
  const highRatedAuthors = new Set<string>();
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

  const top3Genres = new Set(
    [...genreFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g),
  );

  return { top3Genres, readAuthors, highRatedAuthors, startedSeriesIds, dnfSeriesIds };
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
  const [wantToRead, profile] = await Promise.all([
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
    buildUserProfile(userId),
  ]);

  if (wantToRead.length === 0) return [];

  const { top3Genres, readAuthors, highRatedAuthors, startedSeriesIds, dnfSeriesIds } = profile;

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
      // Same gate as the genre path — a stored description can be the same
      // catalog junk, since that's where it was imported from.
      description: usableSynopsis(ub.book.description),
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

// A plain relevance-only genre query skewed heavily toward decades-old
// backlist titles — old books simply accumulate more keyword/subject
// matches over time than a recently-published one has had the chance to.
// +8 nudges recent books up without penalizing old ones, so it doesn't
// fight genres where old is normal and correct (Classics, Poetry, History):
// a 2020s release and a 1920s classic both start at 0 on this signal, and
// only the newer one gets the bump — nothing pushes the classic down. Kept
// below the popularity signal's weight on purpose: "recent" alone isn't
// worth chasing over "actually well-regarded" — sorting the candidate fetch
// itself by raw newest (tried and reverted, see searchBooksByGenre) proved
// that recency with zero quality signal just surfaces obscure filler.
const RECENT_YEARS = 12;

function publishedYear(publishedDate: string | undefined): number | null {
  const match = publishedDate?.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

// Catalog junk that shows up in a provider's "description" field. These are
// real strings observed in live Google Books results, not hypotheticals:
// a price sticker ("Sams Local 11-7-2004 $35.00."), Accelerated Reader
// metadata ("Grade level 8.2, Book #123, Points 4."), and box-set inventory
// lines. `description` is an unvalidated free-text bin, not a synopsis field.
const CATALOG_NOISE =
  /\$\s?\d|Grade level|Points\s+\d|\bAR\b.{0,12}\b(BL|Quiz)\b|Lexile|Contains the complete|^\s*Set of \d/i;

// Suffixes providers append to otherwise-fine copy.
const SOURCE_SUFFIX = /\s*--\s*(Provided by publisher|Publisher'?s description|From publisher)\.?\s*$/i;

/**
 * Returns a description only if it can actually carry a card, else null.
 *
 * The card leads with this text, so an unusable string is worse than none —
 * it looks like a book recommendation while saying nothing about a book.
 * The previous test was "is it non-empty", which a price sticker passes.
 */
export function usableSynopsis(description: string | null | undefined): string | null {
  const cleaned = description?.replace(SOURCE_SUFFIX, "").trim();
  if (!cleaned) return null;
  if (cleaned.length < 60) return null;
  if (CATALOG_NOISE.test(cleaned)) return null;
  return cleaned;
}

// "By Genre" discovery mode — candidates come from outside the library
// (Google Books / Open Library, via searchBooksByGenre), so there's no
// series/genre-match signal to score against (the genre is already the
// user's own pick, true for every result). Scored instead on the personal-
// history signals that still apply, plus two signals for books with no
// personal history at all:
//   +30  author matches a previously-read author
//   +20  user rated another book by this author 4 or 5 stars
//   +10  highly rated by readers generally (Google Books avgRating ≥ 4,
//        with a real sample size — ratingsCount ≥ 50)
//   +8   published within the last ~12 years
// Unlike getSuggestions, zero-score results are kept (not filtered out) and
// still shown, ranked below scored ones — discovery mode's job is to show
// what exists in the genre, not just what matches history, especially for a
// newer library with little reading history to score against yet.
export async function getGenreSuggestions(
  userId: string,
  genre: string,
): Promise<GenreSuggestionResult> {
  const [results, profile, owned] = await Promise.all([
    searchBooksByGenre(genre),
    buildUserProfile(userId),
    prisma.book.findMany({
      where: { userBooks: { some: { userId } } },
      select: { isbn13: true },
    }),
  ]);

  const ownedIsbns = new Set(
    owned.map((b) => b.isbn13).filter((isbn): isbn is string => !!isbn),
  );
  const { readAuthors, highRatedAuthors } = profile;

  const scored: GenreSuggestionItem[] = results
    .filter((r) => !r.isbn13 || !ownedIsbns.has(r.isbn13))
    .map((r) => {
      let score = 0;
      const reasons: string[] = [];

      const knownAuthors = r.authors.filter((a) => readAuthors.has(a));
      if (knownAuthors.length > 0) {
        score += 30;
        reasons.push(
          `By ${knownAuthors[0]}${knownAuthors.length > 1 ? " and others" : ""}, an author you've read`,
        );
      }

      const highRatedMatch = r.authors.some((a) => highRatedAuthors.has(a));
      if (highRatedMatch) {
        score += 20;
        if (!knownAuthors.length) reasons.push("By a highly-rated author");
      }

      if ((r.averageRating ?? 0) >= 4 && (r.ratingsCount ?? 0) >= 50) {
        score += 10;
        reasons.push("Highly rated by readers");
      }

      const year = publishedYear(r.publishedDate);
      if (year !== null && year >= new Date().getFullYear() - RECENT_YEARS) {
        score += 8;
        reasons.push("Recently published");
      }

      // The card leads with the synopsis, so a result that has a usable one
      // is worth more than a bare record — but this is a ranking nudge,
      // never a filter (see the fail-open note on the return). No reason
      // string: "has a description" isn't a recommendation a reader reads.
      const synopsis = usableSynopsis(r.description);
      if (synopsis) score += 6;

      return { ...r, description: synopsis ?? undefined, reasons, score };
    });

  // Fail open, not closed.
  //
  // This used to drop every result without a description, on the logic that
  // a synopsis-led card has nothing to show without one. That made the whole
  // feature depend on a single provider: Open Library's search response never
  // includes a description, only Google Books' does, and both are wrapped in
  // `.catch(() => [])`. So any Google Books hiccup — rate limit, thin
  // records, an outage — filtered *everything* out and the reader got a bare
  // "No results" for a genre with thousands of matching books. Verified in
  // the wild: Fantasy returned 18 rows one hour and nothing the next.
  //
  // Now a description-less result still renders, ranked below the ones that
  // have a synopsis, and falls back to title + author on the card.
  // `providerCount` lets the caller tell "the providers gave us nothing"
  // apart from "you already own everything we found", which are the same
  // empty list but very different messages.
  return {
    results: scored
      .sort((a, b) => b.score - a.score || (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0))
      .slice(0, 20),
    providerCount: results.length,
  };
}
