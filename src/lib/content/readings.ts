import type { KanjiEntry } from "./types";

/** Meanings worth teaching: drops KANJIDIC's "… radical (no. N)" entries. */
export function teachableMeanings(kanji: KanjiEntry): string[] {
  const meanings = kanji.meanings.filter((m) => !/radical/i.test(m));
  return meanings.length > 0 ? meanings : kanji.meanings;
}
