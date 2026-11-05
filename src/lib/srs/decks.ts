import { LESSONS, LESSONS_N4, type Lesson } from "@/lib/content/lessons";
import { teachableMeanings } from "@/lib/content/readings";
import type { KanaEntry, KanjiEntry, VocabEntry } from "@/lib/content/types";
import { displayExpression, parseReading } from "@/lib/content/wordReadings";

/** The decks, in teaching order: kana, then each JLPT level's kanji and words. */
export const DECK_IDS = [
  "hiragana",
  "katakana",
  "kanji-n5",
  "vocab-n5",
  "kanji-n4",
  "vocab-n4",
] as const;
export type DeckId = (typeof DECK_IDS)[number];
export type KanjiDeckId = "kanji-n5" | "kanji-n4";
export type VocabDeckId = "vocab-n5" | "vocab-n4";

export function isKanjiDeck(deckId: DeckId): deckId is KanjiDeckId {
  return deckId === "kanji-n5" || deckId === "kanji-n4";
}

export function isVocabDeck(deckId: DeckId): deckId is VocabDeckId {
  return deckId === "vocab-n5" || deckId === "vocab-n4";
}

export type CardType =
  | "write-from-meaning"
  | "write-from-reading"
  | "write-from-audio"
  | "recognize"
  | "speak";

/** Cards answered aloud: only shown where the device can recognize Japanese. */
export const SPOKEN_CARD_TYPES: CardType[] = ["speak"];

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
  /** Kanji the word uses that the app doesn't teach (beyond N4). */
  extraKanji?: number;
}

export interface Content {
  kana: KanaEntry[];
  /** N5 kanji and words. */
  kanji: KanjiEntry[];
  vocab: VocabEntry[];
  kanjiN4: KanjiEntry[];
  vocabN4: VocabEntry[];
}

/** Kana, ー, 々 and CJK ideographs: everything that ships stroke data. */
const WRITABLE = /^[ぁ-ゖァ-ヺー々一-鿿]+$/u;
const KANJI = /[々一-鿿]/u;

/** Builds every deck's items in teaching order. */
export function buildDecks(content: Content): Record<DeckId, StudyItem[]> {
  const taught = new Set([...content.kanji, ...content.kanjiN4].map((k) => k.char));
  const vocabN5 = vocabItems(content.vocab, taught, "vocab-n5", new Set());
  return {
    hiragana: kanaItems(content.kana, "hiragana"),
    katakana: kanaItems(content.kana, "katakana"),
    "kanji-n5": kanjiItems(content.kanji, LESSONS, "kanji-n5"),
    "vocab-n5": vocabN5,
    "kanji-n4": kanjiItems(content.kanjiN4, LESSONS_N4, "kanji-n4"),
    // A word on both lists stays in N5 only.
    "vocab-n4": vocabItems(content.vocabN4, taught, "vocab-n4", new Set(vocabN5.map((w) => w.id))),
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

function kanjiItems(kanji: KanjiEntry[], lessons: Lesson[], deckId: KanjiDeckId): StudyItem[] {
  const byChar = new Map(kanji.map((k) => [k.char, k]));
  return lessons
    .flatMap((l) => l.kanji)
    .map((c) => byChar.get(c))
    .filter((k) => k !== undefined)
    .map((k) => ({
      deckId,
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

function vocabItems(
  vocab: VocabEntry[],
  taught: Set<string>,
  deckId: VocabDeckId,
  skip: Set<string>,
): StudyItem[] {
  const seen = new Set(skip);
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
      deckId,
      id: written,
      chars,
      reading,
      meaning: word.meaning,
      extraKanji: chars.filter((c) => KANJI.test(c) && !taught.has(c)).length,
    });
  }
  // Words made of taught kanji (or kana only) come first, shorter first.
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
    case "kanji-n4":
      return ["write-from-meaning", "write-from-reading", "recognize"];
    case "vocab-n5":
    case "vocab-n4":
      // A word with kanji can't be written from sound alone (homophones),
      // so it is prompted with its kana instead.
      // Words are also read aloud; single kana and kanji aren't, since
      // recognizers turn a lone sound into whatever word it might be.
      return [
        "write-from-meaning",
        hasKanji(item) ? "write-from-reading" : "write-from-audio",
        "recognize",
        "speak",
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
