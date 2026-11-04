import { LESSONS } from "@/lib/content/lessons";
import { teachableMeanings } from "@/lib/content/readings";
import type { KanaEntry, KanjiEntry, VocabEntry } from "@/lib/content/types";
import { displayExpression, parseReading } from "@/lib/content/wordReadings";

/** The v1 decks (BOOTSTRAP §7), in the order they are offered. */
export const DECK_IDS = ["hiragana", "katakana", "kanji-n5", "vocab-n5"] as const;
export type DeckId = (typeof DECK_IDS)[number];

export type CardType =
  | "write-from-meaning"
  | "write-from-reading"
  | "write-from-audio"
  | "recognize";

/** One thing to learn. Every item becomes a few cards, one per card type. */
export interface StudyItem {
  deckId: DeckId;
  /** Unique within its deck: the character or the word as written. */
  id: string;
  /** What the learner writes, one box per character. */
  chars: string[];
  /** Kana reading; for kanji the main on/kun readings, e.g. "にち / ひ". */
  reading: string;
  /** Kana only: romaji, disambiguated where two kana share it ("ji (from chi)"). */
  romaji?: string;
  /** Kanji and words: short English meaning. */
  meaning?: string;
  /** Kanji the word uses that aren't in the N5 kanji list. */
  extraKanji?: number;
}

export interface Content {
  kana: KanaEntry[];
  kanji: KanjiEntry[];
  vocab: VocabEntry[];
}

/** Kana, ー, 々 and CJK ideographs: everything that ships stroke data. */
const WRITABLE = /^[ぁ-ゖァ-ヺー々一-鿿]+$/u;
const KANJI = /[々一-鿿]/u;

/** Builds every deck's items in teaching order. */
export function buildDecks(content: Content): Record<DeckId, StudyItem[]> {
  return {
    hiragana: kanaItems(content.kana, "hiragana"),
    katakana: kanaItems(content.kana, "katakana"),
    "kanji-n5": kanjiItems(content.kanji),
    "vocab-n5": vocabItems(content.vocab, content.kanji),
  };
}

function kanaItems(
  kana: KanaEntry[],
  kind: KanaEntry["kind"],
): StudyItem[] {
  const ofKind = kana.filter((k) => k.kind === kind);
  const byRomaji = new Map<string, number>();
  for (const k of ofKind) byRomaji.set(k.romaji, (byRomaji.get(k.romaji) ?? 0) + 1);
  return ofKind.map((k) => ({
    deckId: kind,
    id: k.char,
    chars: [k.char],
    reading: k.char,
    romaji: isAmbiguousKana(k, byRomaji) ? `${k.romaji} (from ${baseRomaji(k, ofKind)})` : k.romaji,
  }));
}

function isAmbiguousKana(k: KanaEntry, byRomaji: Map<string, number>) {
  return (byRomaji.get(k.romaji) ?? 0) > 1;
}

/** Voiced kana sit one codepoint after their plain form (じ = し + 1). */
function baseRomaji(k: KanaEntry, ofKind: KanaEntry[]): string {
  const base = String.fromCodePoint(k.char.codePointAt(0)! - 1);
  return ofKind.find((b) => b.char === base)?.romaji ?? k.romaji;
}

/** Kana whose sound is shared with another kana, so audio can't tell them apart. */
export function hasAmbiguousSound(item: StudyItem) {
  return item.romaji?.includes("(") ?? false;
}

function kanjiItems(kanji: KanjiEntry[]): StudyItem[] {
  const byChar = new Map(kanji.map((k) => [k.char, k]));
  return LESSONS.flatMap((l) => l.kanji)
    .map((c) => byChar.get(c))
    .filter((k) => k !== undefined)
    .map((k) => ({
      deckId: "kanji-n5" as const,
      id: k.char,
      chars: [k.char],
      reading: kanjiReading(k),
      meaning: teachableMeanings(k).slice(0, 2).join(", "),
    }));
}

/** First on'yomi and first standalone kun'yomi, both in hiragana. */
export function kanjiReading(k: KanjiEntry): string {
  const on = k.onYomi.map((r) => parseReading(r, "on"))[0];
  const kun = k.kunYomi
    .map((r) => parseReading(r, "kun"))
    .find((r) => !r.prefixOnly && !r.suffixOnly);
  return [on?.stem, kun && kun.stem + kun.okurigana]
    .filter(Boolean)
    .join(" / ");
}

function vocabItems(vocab: VocabEntry[], kanji: KanjiEntry[]): StudyItem[] {
  const n5 = new Set(kanji.map((k) => k.char));
  const seen = new Set<string>();
  const items: StudyItem[] = [];
  for (const word of vocab) {
    // "～円" is a counter: the learner writes 円. "足; 脚": the first form.
    const written = displayExpression(word).replace(/～/g, "");
    const reading = word.reading.split(";")[0].trim().replace(/～/g, "");
    if (!WRITABLE.test(written) || !WRITABLE.test(reading)) continue;
    if (seen.has(written)) continue;
    seen.add(written);
    const chars = [...written];
    items.push({
      deckId: "vocab-n5",
      id: written,
      chars,
      reading,
      meaning: word.meaning,
      extraKanji: chars.filter((c) => KANJI.test(c) && !n5.has(c)).length,
    });
  }
  // Words built from known N5 kanji (or kana only) come first, shorter first.
  return items
    .map((item, i) => ({ item, i }))
    .sort(
      (a, b) =>
        a.item.extraKanji! - b.item.extraKanji! ||
        a.item.chars.length - b.item.chars.length ||
        a.i - b.i,
    )
    .map((x) => x.item);
}

export function hasKanji(item: StudyItem) {
  return item.chars.some((c) => KANJI.test(c));
}

/** The card types an item is studied with (BOOTSTRAP §7). */
export function cardTypesFor(item: StudyItem): CardType[] {
  switch (item.deckId) {
    case "hiragana":
    case "katakana":
      // じ/ぢ and ず/づ sound the same, so they skip the audio card.
      return hasAmbiguousSound(item)
        ? ["write-from-reading", "recognize"]
        : ["write-from-reading", "write-from-audio", "recognize"];
    case "kanji-n5":
      return ["write-from-meaning", "write-from-reading", "recognize"];
    case "vocab-n5":
      // A word with kanji can't be written from sound alone (homophones),
      // so it is prompted with its kana instead.
      return [
        "write-from-meaning",
        hasKanji(item) ? "write-from-reading" : "write-from-audio",
        "recognize",
      ];
  }
}

export function cardId(deckId: DeckId, itemId: string, type: CardType) {
  return `${deckId}|${itemId}|${type}`;
}

export function itemKey(deckId: DeckId, itemId: string) {
  return `${deckId}|${itemId}`;
}

/** The answer a recognize card asks for: romaji for kana, meaning otherwise. */
export function recognizeAnswer(item: StudyItem): string {
  return item.romaji ?? item.meaning ?? item.reading;
}
