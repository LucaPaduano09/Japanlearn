import { buildPath, type Stage } from "@/lib/path/stages";
import { buildDecks, itemKey, type DeckId, type StudyItem } from "@/lib/srs/decks";
import { loadContent } from "./loader";
import type { KanaEntry, KanjiEntry, VocabEntry } from "./types";

/** Everything built from the content files, computed once per app run. */
export interface Library {
  decks: Record<DeckId, StudyItem[]>;
  /** By itemKey(). */
  items: Map<string, StudyItem>;
  kana: Map<string, KanaEntry>;
  kanji: Map<string, KanjiEntry>;
  /** N5 and N4 words (raw entries, for example words and readings). */
  vocab: VocabEntry[];
  path: Stage[];
}

let library: Promise<Library> | null = null;

export function loadLibrary(): Promise<Library> {
  library ??= loadContent().then((content) => {
    const decks = buildDecks(content);
    return {
      decks,
      items: new Map(
        Object.values(decks)
          .flat()
          .map((i) => [itemKey(i.deckId, i.id), i]),
      ),
      kana: new Map(content.kana.map((k) => [k.char, k])),
      kanji: new Map([...content.kanji, ...content.kanjiN4].map((k) => [k.char, k])),
      vocab: [...content.vocab, ...content.vocabN4],
      path: buildPath(decks),
    };
  });
  library.catch(() => (library = null));
  return library;
}
