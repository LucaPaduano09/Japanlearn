import { charToCodepointHex } from "@/lib/strokes/codepoint";
import type { RefStroke } from "@/lib/strokes/types";
import type { KanaEntry, KanjiEntry, VocabEntry } from "./types";

/** One character's reference strokes, from public/data/strokes/<hex>.json. */
export interface StrokeData {
  char: string;
  strokes: RefStroke[];
}

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
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

/** Reference strokes for a single character, or null if none are shipped. */
export async function loadStrokes(char: string): Promise<StrokeData | null> {
  try {
    return await loadJson(`/data/strokes/${charToCodepointHex(char)}.json`);
  } catch {
    return null;
  }
}
