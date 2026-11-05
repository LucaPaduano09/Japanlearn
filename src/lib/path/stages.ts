import { LESSONS, LESSONS_N4, type Lesson, type LessonTitle } from "@/lib/content/lessons";
import {
  itemKey,
  type DeckId,
  type KanjiDeckId,
  type StudyItem,
  type VocabDeckId,
} from "@/lib/srs/decks";

/**
 * The learning path: one ordered list of small stages. Hiragana → katakana
 * → N5 → N4, where each level is its kanji lessons, every lesson followed
 * by the words it makes readable; the remaining words come last. Each stage
 * opens with an explanation and ends with real words the learner can read.
 */

export type Section = "hiragana" | "katakana" | "n5" | "n4" | "words";
export const SECTIONS: Section[] = ["hiragana", "katakana", "n5", "n4", "words"];
export type Level = "n5" | "n4";

/** What the opening screen of a stage explains. */
export type StageIntro =
  | { kind: "vowels"; firstKatakana?: boolean }
  | { kind: "row"; consonant: string }
  | { kind: "y-row" }
  | { kind: "w-row" }
  | { kind: "voiced" }
  | { kind: "semivoiced" }
  | {
      kind: "kanji";
      lesson: LessonTitle;
      part: number;
      parts: number;
      /** First kanji stage of the whole path (explains what kanji are). */
      first: boolean;
      /** First kanji stage of a level after N5 (says a new level starts). */
      levelStart?: Level;
    }
  | { kind: "words"; n: number };

/** A word to read at the end of a stage, with its meaning in each UI language. */
export interface RewardWord {
  word: string;
  /** Kana reading when `word` has kanji. */
  reading?: string;
  meaning: { en: string; it: string } | string;
}

export interface Stage {
  id: string;
  section: Section;
  deckId: DeckId;
  /** Item ids within the deck, in teaching order. */
  items: string[];
  intro: StageIntro;
  rewards: RewardWord[];
}

type Meaning = [en: string, it: string];
const w = (word: string, [en, it]: Meaning): RewardWord => ({ word, meaning: { en, it } });

/** Hiragana rows in table order, each with words that use only kana known by then. */
const KANA_ROWS: {
  chars: string;
  intro: StageIntro;
  hira: RewardWord[];
  kata: RewardWord[];
}[] = [
  {
    chars: "あいうえお",
    intro: { kind: "vowels" },
    hira: [w("あい", ["love", "amore"]), w("いえ", ["house", "casa"]), w("うえ", ["above", "sopra"]), w("あお", ["blue", "blu"])],
    kata: [],
  },
  {
    chars: "かきくけこ",
    intro: { kind: "row", consonant: "k" },
    hira: [w("かお", ["face", "viso"]), w("あき", ["autumn", "autunno"]), w("いけ", ["pond", "stagno"]), w("こえ", ["voice", "voce"])],
    kata: [w("ココア", ["cocoa", "cioccolata calda"])],
  },
  {
    chars: "さしすせそ",
    intro: { kind: "row", consonant: "s" },
    hira: [w("すし", ["sushi", "sushi"]), w("あさ", ["morning", "mattina"]), w("いす", ["chair", "sedia"]), w("かさ", ["umbrella", "ombrello"])],
    kata: [w("アイス", ["ice cream", "gelato"]), w("スイス", ["Switzerland", "Svizzera"])],
  },
  {
    chars: "たちつてと",
    intro: { kind: "row", consonant: "t" },
    hira: [w("くち", ["mouth", "bocca"]), w("くつ", ["shoes", "scarpe"]), w("たかい", ["tall; expensive", "alto; caro"]), w("ちかてつ", ["subway", "metropolitana"])],
    kata: [w("テスト", ["test", "verifica"]), w("テキスト", ["textbook", "libro di testo"])],
  },
  {
    chars: "なにぬねの",
    intro: { kind: "row", consonant: "n" },
    hira: [w("いぬ", ["dog", "cane"]), w("ねこ", ["cat", "gatto"]), w("なつ", ["summer", "estate"]), w("さかな", ["fish", "pesce"])],
    kata: [w("テニス", ["tennis", "tennis"]), w("ネクタイ", ["necktie", "cravatta"])],
  },
  {
    chars: "はひふへほ",
    intro: { kind: "row", consonant: "h" },
    hira: [w("はな", ["flower", "fiore"]), w("ひと", ["person", "persona"]), w("ふね", ["ship", "nave"]), w("ほし", ["star", "stella"])],
    kata: [w("ナイフ", ["knife", "coltello"])],
  },
  {
    chars: "まみむめも",
    intro: { kind: "row", consonant: "m" },
    hira: [w("め", ["eye", "occhio"]), w("みみ", ["ear", "orecchio"]), w("むし", ["insect", "insetto"]), w("もも", ["peach", "pesca"])],
    kata: [w("メモ", ["memo", "appunto"]), w("ハム", ["ham", "prosciutto"]), w("マスク", ["mask", "mascherina"])],
  },
  {
    chars: "やゆよ",
    intro: { kind: "y-row" },
    hira: [w("やま", ["mountain", "montagna"]), w("ゆき", ["snow", "neve"]), w("ゆめ", ["dream", "sogno"]), w("やすみ", ["day off", "giorno libero"])],
    kata: [w("タイヤ", ["tire", "pneumatico"])],
  },
  {
    chars: "らりるれろ",
    intro: { kind: "row", consonant: "r" },
    hira: [w("よる", ["night", "notte"]), w("はれ", ["sunny weather", "bel tempo"]), w("くるま", ["car", "auto"]), w("さくら", ["cherry blossom", "fiore di ciliegio"])],
    kata: [w("カメラ", ["camera", "macchina fotografica"]), w("ホテル", ["hotel", "hotel"]), w("トイレ", ["toilet", "bagno"])],
  },
  {
    chars: "わをん",
    intro: { kind: "w-row" },
    hira: [w("ほん", ["book", "libro"]), w("わたし", ["I, me", "io"]), w("みかん", ["mandarin orange", "mandarino"]), w("にほん", ["Japan", "Giappone"])],
    kata: [w("ワイン", ["wine", "vino"]), w("メロン", ["melon", "melone"]), w("レモン", ["lemon", "limone"])],
  },
  {
    chars: "がぎぐげご",
    intro: { kind: "voiced" },
    hira: [w("かぎ", ["key", "chiave"]), w("ごご", ["afternoon", "pomeriggio"]), w("めがね", ["glasses", "occhiali"])],
    kata: [w("ガム", ["chewing gum", "chewing gum"]), w("ゴリラ", ["gorilla", "gorilla"])],
  },
  {
    chars: "ざじずぜぞ",
    intro: { kind: "voiced" },
    hira: [w("かぜ", ["wind", "vento"]), w("みず", ["water", "acqua"]), w("ちず", ["map", "mappa"]), w("かぞく", ["family", "famiglia"])],
    kata: [w("ゼロ", ["zero", "zero"]), w("サイズ", ["size", "taglia"]), w("ラジオ", ["radio", "radio"])],
  },
  {
    chars: "だぢづでど",
    intro: { kind: "voiced" },
    hira: [w("まど", ["window", "finestra"]), w("だれ", ["who?", "chi?"]), w("からだ", ["body", "corpo"]), w("でんわ", ["telephone", "telefono"])],
    kata: [w("ドア", ["door", "porta"]), w("ドラマ", ["TV drama", "serie TV"]), w("デザイン", ["design", "design"])],
  },
  {
    chars: "ばびぶべぼ",
    intro: { kind: "voiced" },
    hira: [w("えび", ["shrimp", "gambero"]), w("くび", ["neck", "collo"]), w("へび", ["snake", "serpente"]), w("かばん", ["bag", "borsa"])],
    kata: [w("バス", ["bus", "autobus"]), w("ベンチ", ["bench", "panchina"]), w("テレビ", ["TV", "televisione"])],
  },
  {
    chars: "ぱぴぷぺぽ",
    intro: { kind: "semivoiced" },
    hira: [w("さんぽ", ["walk", "passeggiata"]), w("えんぴつ", ["pencil", "matita"]), w("てんぷら", ["tempura", "tempura"])],
    kata: [w("パン", ["bread", "pane"]), w("ペン", ["pen", "penna"]), w("ピアノ", ["piano", "pianoforte"])],
  },
];

/** Katakana mirror hiragana one codepoint block up (あ → ア). */
export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (c) => String.fromCodePoint(c.codePointAt(0)! + 0x60));
}

/** How many kanji go in one stage; longer lessons are split. */
export const KANJI_PER_STAGE = 5;
export const WORDS_PER_STAGE = 6;
/** Most words practiced right after a kanji lesson (the rest wait till the end). */
export const MAX_WORDS_PER_LESSON = 18;
/** Fewer readable words than this after a lesson: top up with kana-only words. */
export const MIN_WORDS_PER_LESSON = 12;
/** Words shown as the reward of a kanji stage. */
const KANJI_REWARDS = 3;

const KANJI_CHAR = /[々一-鿿]/u;

const LEVELS: {
  level: Level;
  lessons: Lesson[];
  kanjiDeck: KanjiDeckId;
  vocabDeck: VocabDeckId;
}[] = [
  { level: "n5", lessons: LESSONS, kanjiDeck: "kanji-n5", vocabDeck: "vocab-n5" },
  { level: "n4", lessons: LESSONS_N4, kanjiDeck: "kanji-n4", vocabDeck: "vocab-n4" },
];

function toReward(word: StudyItem): RewardWord {
  return {
    word: word.id,
    reading: word.reading !== word.id ? word.reading : undefined,
    meaning: word.meaning!,
  };
}

/** Builds the whole path from the decks (each already in teaching order). */
export function buildPath(decks: Record<DeckId, StudyItem[]>): Stage[] {
  const stages: Stage[] = [];

  for (const kind of ["hiragana", "katakana"] as const) {
    KANA_ROWS.forEach((row, i) => {
      const chars = kind === "hiragana" ? row.chars : toKatakana(row.chars);
      const intro =
        kind === "katakana" && i === 0 ? { kind: "vowels" as const, firstKatakana: true } : row.intro;
      stages.push({
        id: `${kind === "hiragana" ? "hira" : "kata"}-${i + 1}`,
        section: kind,
        deckId: kind,
        items: [...chars],
        intro,
        rewards: kind === "hiragana" ? row.hira : row.kata,
      });
    });
  }

  const allWords = [...decks["vocab-n5"], ...decks["vocab-n4"]];
  const knownKanji = new Set<string>();
  const readable = (word: StudyItem) =>
    word.chars.every((c) => !KANJI_CHAR.test(c) || knownKanji.has(c));
  const rewarded = new Set<string>();
  const placed = new Set<string>();
  let wordStages = 0;

  const pushWords = (section: Section, deckId: VocabDeckId, id: string, words: StudyItem[]) => {
    for (let i = 0; i < words.length; i += WORDS_PER_STAGE) {
      const chunk = words.slice(i, i + WORDS_PER_STAGE);
      chunk.forEach((w) => placed.add(w.id));
      wordStages++;
      stages.push({
        id: `${id}-${i / WORDS_PER_STAGE + 1}`,
        section,
        deckId,
        items: chunk.map((x) => x.id),
        intro: { kind: "words", n: wordStages },
        rewards: chunk.map(toReward),
      });
    }
  };

  for (const { level, lessons, kanjiDeck, vocabDeck } of LEVELS) {
    const vocab = decks[vocabDeck];
    lessons.forEach((lesson, li) => {
      const parts = Math.ceil(lesson.kanji.length / KANJI_PER_STAGE);
      for (let p = 0; p < parts; p++) {
        const items = lesson.kanji.slice(p * KANJI_PER_STAGE, (p + 1) * KANJI_PER_STAGE);
        items.forEach((c) => knownKanji.add(c));
        const rewards = allWords
          .filter(
            (word) =>
              !rewarded.has(word.id) &&
              word.chars.some((c) => items.includes(c)) &&
              readable(word),
          )
          .slice(0, KANJI_REWARDS);
        rewards.forEach((r) => rewarded.add(r.id));
        stages.push({
          id: `kanji-${lesson.id}-${p + 1}`,
          section: level,
          deckId: kanjiDeck,
          items,
          intro: {
            kind: "kanji",
            lesson: lesson.title,
            part: p + 1,
            parts,
            first: level === "n5" && li === 0 && p === 0,
            levelStart: level !== "n5" && li === 0 && p === 0 ? level : undefined,
          },
          rewards: rewards.map(toReward),
        });
      }

      // Practice the words this lesson made readable, topped up with
      // kana-only words when there are only a few.
      const unlocked = vocab
        .filter(
          (w) => !placed.has(w.id) && w.chars.some((c) => lesson.kanji.includes(c)) && readable(w),
        )
        .slice(0, MAX_WORDS_PER_LESSON);
      const kanaOnly = vocab.filter(
        (w) => !placed.has(w.id) && !w.chars.some((c) => KANJI_CHAR.test(c)),
      );
      const words = [
        ...unlocked,
        ...kanaOnly.slice(0, Math.max(0, MIN_WORDS_PER_LESSON - unlocked.length)),
      ];
      pushWords(level, vocabDeck, `words-${lesson.id}`, words);
    });
  }

  for (const { vocabDeck, level } of LEVELS) {
    pushWords(
      "words",
      vocabDeck,
      `words-more-${level}`,
      decks[vocabDeck].filter((w) => !placed.has(w.id)),
    );
  }
  return stages;
}

export type StageStatus = "done" | "current" | "locked";

export interface StageProgress {
  stage: Stage;
  status: StageStatus;
  /** Items of the stage already introduced. */
  done: number;
}

/**
 * Status of every stage from the introduced items. The first stage that
 * isn't finished is the current one; everything after it is locked.
 */
export function pathProgress(stages: Stage[], introduced: Set<string>): StageProgress[] {
  let currentFound = false;
  return stages.map((stage) => {
    const done = stage.items.filter((id) => introduced.has(itemKey(stage.deckId, id))).length;
    let status: StageStatus;
    if (done === stage.items.length) status = "done";
    else if (!currentFound) {
      status = "current";
      currentFound = true;
    } else status = "locked";
    return { stage, status, done };
  });
}

/** Where a stage resumes: its first item not yet introduced (0 when redoing it). */
export function resumeIndex(stage: Stage, introduced: Set<string>): number {
  const i = stage.items.findIndex((id) => !introduced.has(itemKey(stage.deckId, id)));
  return i < 0 ? 0 : i;
}

export interface RowPart {
  char: string;
  romaji: string;
  consonant: string;
  vowel: string;
  /** Doesn't read as consonant + vowel (し = shi, not si). */
  irregular: boolean;
}

/** Splits a row of kana into consonant + vowel, flagging the exceptions. */
export function rowBreakdown(
  items: { char: string; romaji: string }[],
  consonant: string,
): RowPart[] {
  return items.map(({ char, romaji }) => {
    const vowel = romaji.slice(-1);
    return { char, romaji, consonant, vowel, irregular: romaji !== consonant + vowel };
  });
}

/** For ゛/゜ stages: the plain kana each voiced one comes from (が ← か, ぱ ← は). */
export function voicedBase(char: string, semivoiced = false): string {
  return String.fromCodePoint(char.codePointAt(0)! - (semivoiced ? 2 : 1));
}

/** Picks the meaning in the UI language (data meanings are English only). */
export function rewardMeaning(r: RewardWord, locale: "en" | "it"): string {
  return typeof r.meaning === "string" ? r.meaning : r.meaning[locale];
}
