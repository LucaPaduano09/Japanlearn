import { charToCodepointHex } from "@/lib/strokes/codepoint";
import type { RefStroke } from "@/lib/strokes/types";
import type { KanaEntry, KanjiEntry, VocabEntry } from "./types";

/** One character's reference strokes, from public/data/strokes/<hex>.json. */
export interface StrokeData {
  char: string;
  strokes: RefStroke[];
}

/** Content never changes at runtime, so each file is fetched once per app run. */
const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(path: string): Promise<T> {
  let pending = cache.get(path);
  if (!pending) {
    pending = fetch(path).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
      return res.json();
    });
    // A failed fetch shouldn't stick: let the next call retry.
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending as Promise<T>;
}

export function loadKana(): Promise<KanaEntry[]> {
  return loadJson("/data/kana.json");
}

export function loadKanjiN5(): Promise<KanjiEntry[]> {
  return loadJson("/data/kanji-n5.json");
}

export function loadVocabN5(): Promise<VocabEntry[]> {
  return loadJson("/data/vocab-n5.json");
}

export function loadKanjiN4(): Promise<KanjiEntry[]> {
  return loadJson("/data/kanji-n4.json");
}

export function loadVocabN4(): Promise<VocabEntry[]> {
  return loadJson("/data/vocab-n4.json");
}

/** Every kanji the app teaches (N5 then N4). */
export async function loadAllKanji(): Promise<KanjiEntry[]> {
  const [n5, n4] = await Promise.all([loadKanjiN5(), loadKanjiN4()]);
  return [...n5, ...n4];
}

/** All content files at once (decks are built from them together). */
export async function loadContent() {
  const [kana, kanji, vocab, kanjiN4, vocabN4] = await Promise.all([
    loadKana(),
    loadKanjiN5(),
    loadVocabN5(),
    loadKanjiN4(),
    loadVocabN4(),
  ]);
  return { kana, kanji, vocab, kanjiN4, vocabN4 };
}

/** Reference strokes for a single character, or null if none are shipped. */
export async function loadStrokes(char: string): Promise<StrokeData | null> {
  try {
    return await loadJson(`/data/strokes/${charToCodepointHex(char)}.json`);
  } catch {
    return null;
  }
}
