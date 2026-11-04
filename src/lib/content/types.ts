/** One kana character, from public/data/kana.json. */
export interface KanaEntry {
  char: string;
  romaji: string;
  kind: "hiragana" | "katakana";
}

/** One JLPT N5 kanji, from public/data/kanji-n5.json. */
export interface KanjiEntry {
  char: string;
  strokeCount: number;
  grade: number | null;
  onYomi: string[];
  kunYomi: string[];
  meanings: string[];
}

/** One JLPT N5 vocabulary entry, from public/data/vocab-n5.json. */
export interface VocabEntry {
  expression: string;
  reading: string;
  meaning: string;
}
