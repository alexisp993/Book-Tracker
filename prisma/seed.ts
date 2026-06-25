import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCAL_USER_EMAIL = "local@booktracker.app";

interface SeedBook {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  isbn13?: string;
  pageCount?: number;
  language?: string;
  description?: string;
  status: string;
  rating?: number;
  favorite?: boolean;
  currentPage?: number;
}

const SAMPLE_BOOKS: SeedBook[] = [
  {
    title: "Project Hail Mary",
    authors: ["Andy Weir"],
    publisher: "Ballantine Books",
    publishedDate: "2021",
    isbn13: "9780593135204",
    pageCount: 496,
    language: "en",
    status: "READ",
    rating: 5,
    favorite: true,
    description: "A lone astronaut must save humanity in this science thriller.",
  },
  {
    title: "The Name of the Wind",
    subtitle: "The Kingkiller Chronicle: Day One",
    authors: ["Patrick Rothfuss"],
    publisher: "DAW Books",
    publishedDate: "2007",
    isbn13: "9780756404741",
    pageCount: 662,
    language: "en",
    status: "CURRENTLY_READING",
    currentPage: 240,
  },
  {
    title: "Dune",
    authors: ["Frank Herbert"],
    publisher: "Chilton Books",
    publishedDate: "1965",
    isbn13: "9780441013593",
    pageCount: 412,
    language: "en",
    status: "WANT_TO_READ",
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: LOCAL_USER_EMAIL },
    update: {},
    create: { email: LOCAL_USER_EMAIL, name: "You" },
  });

  for (const seed of SAMPLE_BOOKS) {
    const book = await prisma.book.create({
      data: {
        title: seed.title,
        subtitle: seed.subtitle,
        publisher: seed.publisher,
        publishedDate: seed.publishedDate,
        isbn13: seed.isbn13,
        pageCount: seed.pageCount,
        language: seed.language,
        description: seed.description,
        source: "MANUAL",
        authors: {
          create: seed.authors.map((name, order) => ({
            order,
            author: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
    });

    await prisma.userBook.create({
      data: {
        userId: user.id,
        bookId: book.id,
        status: seed.status,
        rating: seed.rating,
        favorite: seed.favorite ?? false,
        currentPage: seed.currentPage ?? 0,
        finishDate: seed.status === "READ" ? new Date() : null,
        startDate:
          seed.status === "CURRENTLY_READING" || seed.status === "READ"
            ? new Date()
            : null,
      },
    });
  }

  console.log(
    `Seeded user ${user.email} with ${SAMPLE_BOOKS.length} sample books.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
