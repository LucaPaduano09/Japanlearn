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
      kanji: new Map(content.kanji.map((k) => [k.char, k])),
      vocab: content.vocab,
      path: buildPath(decks["vocab-n5"]),
    };
  });
  library.catch(() => (library = null));
  return library;
}
