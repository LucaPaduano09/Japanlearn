import { toHiragana } from "./romaji";
import type { KanjiEntry, VocabEntry } from "./types";

/**
 * Works out which of a kanji's readings a word uses, so lessons can show
 * words under the reading they teach. KANJIDIC2 readings look like
 * "ニチ" (on), "やす.い" (kun, okurigana after the dot), "-か" (suffix only).
 */

export type ReadingKind = "on" | "kun";

export interface Reading {
  kind: ReadingKind;
  /** As in KANJIDIC2, e.g. "やす.い". Used as the key for grouping. */
  raw: string;
  /** Kana the kanji itself is read as (hiragana), e.g. "やす". */
  stem: string;
  /** Hiragana written after the kanji, e.g. "い"; "" if none. */
  okurigana: string;
  /** "-" markers: only used attached to other words. */
  prefixOnly: boolean;
  suffixOnly: boolean;
}

export function parseReading(raw: string, kind: ReadingKind): Reading {
  const [stem, okurigana = ""] = raw.split(".");
  return {
    kind,
    raw,
    stem: toHiragana(stem.replace(/-/g, "")),
    okurigana: okurigana.replace(/-/g, ""),
    suffixOnly: raw.startsWith("-"),
    prefixOnly: raw.endsWith("-"),
  };
}

export function readingsOf(kanji: KanjiEntry): Reading[] {
  return [
    ...kanji.onYomi.map((r) => parseReading(r, "on")),
    ...kanji.kunYomi.map((r) => parseReading(r, "kun")),
  ];
}

const VOICED: Record<string, string[]> = {
  か: ["が"],
  き: ["ぎ"],
  く: ["ぐ"],
  け: ["げ"],
  こ: ["ご"],
  さ: ["ざ"],
  し: ["じ"],
  す: ["ず"],
  せ: ["ぜ"],
  そ: ["ぞ"],
  た: ["だ"],
  ち: ["ぢ", "じ"],
  つ: ["づ", "ず"],
  て: ["で"],
  と: ["ど"],
  は: ["ば", "ぱ"],
  ひ: ["び", "ぴ"],
  ふ: ["ぶ", "ぷ"],
  へ: ["べ", "ぺ"],
  ほ: ["ぼ", "ぽ"],
};
/** Endings that turn into a small っ before another sound (がく → がっこう). */
const GEMINATING = new Set(["つ", "ち", "く", "き"]);

/** The forms a reading takes inside words: as is, voiced (rendaku), clipped to っ. */
export function readingVariants(stem: string): string[] {
  if (!stem) return [];
  const voiced = (VOICED[stem[0]] ?? []).map((v) => v + stem.slice(1));
  const bases = [stem, ...voiced];
  const clipped = bases
    .filter((b) => b.length > 1 && GEMINATING.has(b.at(-1)!))
    .map((b) => b.slice(0, -1) + "っ");
  return [...bases, ...clipped];
}

const KANA = /^[぀-ヿ]*$/;

export interface WordMatch {
  word: VocabEntry;
  /** The word's reading as shown (first alternative, no ～ markers). */
  kana: string;
  /** Index of the kanji in word.expression. */
  charIndex: number;
  /** Which reading the kanji takes here; null = special (whole-word) reading. */
  reading: Reading | null;
  /** [start, end) of the kanji's part in `kana`, when a reading matched. */
  span: [number, number] | null;
}

/** Cleans a word-list field: first alternative, no ～ or (usage notes). */
function clean(field: string) {
  return field
    .split(";")[0]
    .replace(/[(（][^)）]*[)）]/g, "")
    .replace(/[～〜]/g, "")
    .trim();
}

/** A word as shown in lessons: first alternative, keeping ～ (marks a suffix/counter). */
export function displayExpression(word: VocabEntry): string {
  return word.expression.split(";")[0].trim();
}

export function matchWord(
  kanji: KanjiEntry,
  word: VocabEntry,
): WordMatch | null {
  const expression = clean(word.expression);
  const kana = toHiragana(clean(word.reading));
  const charIndex = expression.indexOf(kanji.char);
  if (charIndex < 0) return null;

  const prefix = expression.slice(0, charIndex);
  const suffix = expression.slice(charIndex + 1);
  // Kana neighbours pin down exactly where the kanji's sound starts / ends.
  const start = KANA.test(prefix) ? toHiragana(prefix).length : null;
  const end = KANA.test(suffix)
    ? kana.length - toHiragana(suffix).length
    : null;
  if (start !== null && !kana.startsWith(toHiragana(prefix))) return special();
  if (end !== null && !kana.endsWith(toHiragana(suffix))) return special();

  const kanaSuffix = KANA.test(suffix) ? toHiragana(suffix) : "";
  let best: { reading: Reading; span: [number, number]; score: number } | null =
    null;
  for (const reading of readingsOf(kanji)) {
    readingVariants(reading.stem).forEach((v, variant) => {
      let at = -1;
      if (start !== null && end !== null)
        at = kana.slice(start, end) === v ? start : -1;
      else if (start !== null) at = kana.startsWith(v, start) ? start : -1;
      else if (end !== null)
        at = kana.slice(0, end).endsWith(v) ? end - v.length : -1;
      else at = kana.indexOf(v);
      if (at < 0) return;
      const score = scoreMatch(
        reading,
        v,
        variant === 0,
        kanaSuffix,
        KANA.test(prefix + suffix),
      );
      if (!best || score > best.score)
        best = { reading, span: [at, at + v.length], score };
    });
  }
  const found = best as { reading: Reading; span: [number, number] } | null;
  return found
    ? { word, kana, charIndex, reading: found.reading, span: found.span }
    : special();

  function special(): WordMatch {
    return { word, kana, charIndex, reading: null, span: null };
  }
}

/**
 * Ranks candidate readings for one kanji in one word: longer matches first,
 * then okurigana that agrees with the kana written after the kanji
 * (安い → やす.い, not やす.らか), then the plain form over a rendaku one,
 * then kun for a kanji standing alone or with okurigana.
 */
function scoreMatch(
  reading: Reading,
  variant: string,
  plain: boolean,
  kanaSuffix: string,
  onlyKanaAround: boolean,
): number {
  let score = variant.length * 1000;
  if (reading.okurigana) {
    score += kanaSuffix.startsWith(reading.okurigana)
      ? 100 + reading.okurigana.length
      : -100;
  }
  if (plain) score += 10;
  if (reading.kind === "kun" && onlyKanaAround) score += 1;
  return score;
}

export interface ReadingGroup {
  reading: Reading;
  words: WordMatch[];
}

export interface LessonReadings {
  /** Readings used in at least one N5 word, each with its example words. */
  main: { on: ReadingGroup[]; kun: ReadingGroup[] };
  /** Readings no N5 word uses (shown collapsed). */
  other: Reading[];
  /** Words read as a whole (明日 = あした), not kanji by kanji. */
  special: WordMatch[];
}

/**
 * Groups N5 words under the reading of `kanji` they use. Shorter words come
 * first. The first reading of each kind is always main, words or not.
 */
export function lessonReadings(
  kanji: KanjiEntry,
  vocab: VocabEntry[],
  { wordsPerReading = 2, specialLimit = 2 } = {},
): LessonReadings {
  const matches = vocab
    .map((w) => matchWord(kanji, w))
    .filter((m): m is WordMatch => m !== null)
    .sort(
      (a, b) =>
        clean(a.word.expression).length - clean(b.word.expression).length,
    );

  const seen = new Set<string>();
  const unique = matches.filter((m) => {
    const key = clean(m.word.expression) + m.kana;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const readings = readingsOf(kanji);
  const groups = readings.map((reading) => ({
    reading,
    words: unique
      .filter((m) => m.reading?.raw === reading.raw)
      .slice(0, wordsPerReading),
  }));
  // KANJIDIC lists the most common reading of each kind first: always keep it.
  const used = groups.filter(
    (g) =>
      g.words.length > 0 ||
      groups.find((f) => f.reading.kind === g.reading.kind) === g,
  );
  const mainRaw = new Set(used.map((g) => g.reading.kind + g.reading.raw));

  return {
    main: {
      on: used.filter((g) => g.reading.kind === "on"),
      kun: used.filter((g) => g.reading.kind === "kun"),
    },
    other: readings.filter((r) => !mainRaw.has(r.kind + r.raw)),
    special: unique.filter((m) => m.reading === null).slice(0, specialLimit),
  };
}
