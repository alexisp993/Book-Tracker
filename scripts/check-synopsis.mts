// Regression check for the suggestion-card synopsis filters.
//
// These are heuristics — language detection and title-leak detection both
// trade precision for recall — so they need cases pinned to real strings
// rather than invented ones. Every "drop" case below was observed live on the
// By Genre tab. Run with: npx tsx scripts/check-synopsis.mts
//
// It imports the real function rather than a copy: a transcribed version of
// the logic passed this suite while the real one behaved differently, which
// is exactly the failure a duplicate invites.
import { usableSynopsis } from "../lib/suggestions";

const cases: [keep: boolean, label: string, synopsis: string, title: string][] = [
  [false, "title leak (series name in blurb)",
    '"The final adventure in J.K. Rowling\'s phenomenal, best-selling Harry Potter book series and a thrilling conclusion to the saga."',
    "Harry Potter and the Deathly Hallows"],
  [false, "edition marketing",
    "Our hardcover and paperback digest editions of THE CHRONICLES OF NARNIA are now graced with new jacket and cover art by 2-time Caldecott medalist David Wiesner.",
    "The Chronicles of Narnia"],
  [false, "single-word title present",
    "Frankenstein creates a living being from parts of the dead, then recoils in horror from what he has made and abandons it to the world.",
    "Frankenstein"],
  [false, "spanish",
    "Una novela sobre la vida de una familia en un pueblo pequeno donde los secretos del pasado vuelven para atormentar a todos sus habitantes durante un verano largo.",
    "Sombras"],
  [false, "french",
    "Un jeune homme decouvre les secrets de sa famille dans une maison abandonnee au bord de la mer, ou chaque piece renferme un souvenir douloureux de son enfance.",
    "La Maison"],
  [false, "german",
    "Ein junger Mann entdeckt die Geheimnisse seiner Familie in einem verlassenen Haus am Meer, wo jeder Raum eine schmerzhafte Erinnerung an seine Kindheit birgt.",
    "Das Haus"],
  [false, "japanese",
    "彼は小さな町で育ち、家族の秘密を知ることになる。その物語は長い間語られてこなかった。彼の人生は変わってしまう。",
    "物語"],
  [true, "real english (All the Missing Girls)",
    "Ten years after leaving Cooley Ridge, Nicolette Farrell returns to care for her ailing father. A decade ago, she, her brother Daniel, her boyfriend Tyler, and Corinne's boyfriend Jackson were suspects when a girl vanished.",
    "All the Missing Girls"],
  [true, "real english (Riddle-Master)",
    "In seeking the answer to the riddle of the three stars on his forehead and the three stars on the enchanted harp and sword, Morgon, Prince of Hed, goes ultimately to the High One, himself.",
    "The Riddle-Master of Hed"],
  [true, "single-word title absent from blurb",
    "A boy grows to manhood while attempting to subdue the evil he unleashed on the world as an apprentice to the Master Wizard of his island.",
    "A Wizard of Earthsea"],
];

let pass = 0;
let fail = 0;
for (const [keep, label, synopsis, title] of cases) {
  // Discovery-mode settings — the only path where these two filters apply.
  const got = usableSynopsis(synopsis, { title, requireEnglish: true });
  const ok = (got !== null) === keep;
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${keep ? "keep" : "drop"}: ${label} -> ${got === null ? "dropped" : "kept"}`,
  );
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
