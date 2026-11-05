import type { StudyItem } from "@/lib/srs/decks";

/**
 * Speech recognizers write what they hear the way a native would: kanji,
 * katakana, digits and punctuation ("ねこ" → "猫。", "ひとつ" → "1つ"). These
 * helpers bring an answer and the expected word to the same form.
 */

/** Spaces, 。、！？・ and the like. ー is a letter (Lm), so it stays. */
const PUNCTUATION = /[\s\p{P}\p{S}]/gu;
const DIGITS = "〇一二三四五六七八九";

/** Hiragana, no punctuation or spaces, digits as kanji numerals. */
export function normalizeSpoken(text: string): string {
  return toHiragana(text.normalize("NFKC"))
    // Punctuation first, so "1,000" is one number.
    .replace(PUNCTUATION, "")
    .replace(/\d+/g, (n) => kanjiNumber(Number(n)))
    .toLowerCase();
}

/** Katakana → hiragana (ァ..ヶ sit 0x60 after ぁ..ゖ); ー stays. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 1 → 一, 20 → 二十, 105 → 百五, 3000 → 三千 (up to 9999; larger stays as digits). */
export function kanjiNumber(n: number): string {
  if (n === 0) return DIGITS[0];
  if (!Number.isInteger(n) || n < 0 || n > 9999) return String(n);
  let out = "";
  for (const [unit, sign] of [
    [1000, "千"],
    [100, "百"],
    [10, "十"],
  ] as const) {
    const d = Math.floor(n / unit) % 10;
    if (d > 0) out += (d === 1 ? "" : DIGITS[d]) + sign;
  }
  return out + (n % 10 > 0 ? DIGITS[n % 10] : "");
}

/** Written form → readings of every word, for words the recognizer spells with other kanji. */
export type ReadingIndex = Map<string, Set<string>>;

export function buildReadingIndex(items: StudyItem[]): ReadingIndex {
  const index: ReadingIndex = new Map();
  for (const item of items) {
    const written = normalizeSpoken(item.chars.join(""));
    const readings = index.get(written) ?? new Set<string>();
    readings.add(normalizeSpoken(item.reading));
    index.set(written, readings);
  }
  return index;
}

export interface SpokenResult {
  ok: boolean;
  /** What to show as "heard": the matching transcript, else the most likely one. */
  heard: string;
}

/**
 * Whether any transcript is the item said aloud. A transcript counts when it
 * is the word's kana, the word as written, or another word with the same
 * reading (かみ comes back as 髪 for 紙: the sound was right).
 */
export function matchSpoken(
  item: Pick<StudyItem, "chars" | "reading">,
  transcripts: string[],
  index: ReadingIndex = new Map(),
): SpokenResult {
  const reading = normalizeSpoken(item.reading);
  const written = normalizeSpoken(item.chars.join(""));
  for (const t of transcripts) {
    const heard = normalizeSpoken(t);
    if (heard === reading || heard === written || index.get(heard)?.has(reading)) {
      return { ok: true, heard: t.trim() };
    }
  }
  return { ok: false, heard: transcripts[0]?.trim() ?? "" };
}
