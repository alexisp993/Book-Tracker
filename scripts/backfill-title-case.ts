// One-time data fix-up: normalizes existing Book.title/subtitle and
// Author.name casing (e.g. "the tipping point" -> "The Tipping Point") for
// rows saved before the toTitleCase() save-boundary fix existed. Safe to
// re-run (idempotent) — only updates rows whose normalized value differs.
//
// Usage:
//   npx tsx scripts/backfill-title-case.ts --dry-run   (preview only, no writes)
//   npx tsx scripts/backfill-title-case.ts             (apply)
import { PrismaClient } from "@prisma/client";
import { toTitleCase } from "../lib/utils";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

async function backfillBooks() {
  let skip = 0;
  let updated = 0;
  for (;;) {
    const books = await prisma.book.findMany({
      select: { id: true, title: true, subtitle: true },
      skip,
      take: BATCH_SIZE,
    });
    if (books.length === 0) break;

    for (const book of books) {
      const newTitle = toTitleCase(book.title);
      const newSubtitle = book.subtitle ? toTitleCase(book.subtitle) : book.subtitle;
      if (newTitle !== book.title || newSubtitle !== book.subtitle) {
        console.log(`Book ${book.id}: "${book.title}" -> "${newTitle}"`);
        if (book.subtitle !== newSubtitle) {
          console.log(`  subtitle: "${book.subtitle}" -> "${newSubtitle}"`);
        }
        if (!dryRun) {
          await prisma.book.update({
            where: { id: book.id },
            data: { title: newTitle, subtitle: newSubtitle },
          });
        }
        updated++;
      }
    }
    skip += BATCH_SIZE;
  }
  return updated;
}

async function backfillAuthors() {
  let skip = 0;
  let updated = 0;
  for (;;) {
    const authors = await prisma.author.findMany({
      select: { id: true, name: true },
      skip,
      take: BATCH_SIZE,
    });
    if (authors.length === 0) break;

    for (const author of authors) {
      const newName = toTitleCase(author.name);
      if (newName !== author.name) {
        console.log(`Author ${author.id}: "${author.name}" -> "${newName}"`);
        if (!dryRun) {
          // Author.name is unique — another author with the normalized name
          // may already exist (e.g. "Stephen King" and "stephen king" both
          // stored). Merge into the existing row instead of failing on a
          // unique-constraint violation.
          const existing = await prisma.author.findUnique({ where: { name: newName } });
          if (existing && existing.id !== author.id) {
            await prisma.bookAuthor.updateMany({
              where: { authorId: author.id },
              data: { authorId: existing.id },
            });
            await prisma.author.delete({ where: { id: author.id } });
          } else {
            await prisma.author.update({ where: { id: author.id }, data: { name: newName } });
          }
        }
        updated++;
      }
    }
    skip += BATCH_SIZE;
  }
  return updated;
}

async function main() {
  console.log(dryRun ? "Dry run — no changes will be written.\n" : "Applying changes.\n");
  const booksUpdated = await backfillBooks();
  const authorsUpdated = await backfillAuthors();
  console.log(`\n${booksUpdated} book(s) and ${authorsUpdated} author(s) ${dryRun ? "would be" : "were"} updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
