import { toHiragana } from "./romaji";
import type { KanjiEntry } from "./types";
import { readingsOf, readingVariants } from "./wordReadings";

/**
 * Splits a word's reading over its characters, so the kana can sit above
 * the kanji they belong to (furigana): 毎日 + まいにち → 毎/まい 日/にち.
 * Kanji are matched against their KANJIDIC readings; a run of kanji that
 * can't be split (明日 = あした) gets one reading over the whole run.
 */

export interface RubySegment {
  /** Characters as written. */
  text: string;
  /** Kana above them; absent for kana and symbols (～). */
  ruby?: string;
  /** Index of `text` in the expression. */
  index: number;
}

// ヶ counts as a kanji: written in kanji words, read か (一ヶ月 = いっかげつ).
const KANJI = /[々〆ヶ一-鿿]/u;
const KANA = /[぀-ゖァ-ヺー]/u;

type Lookup = (char: string) => KanjiEntry | undefined;

/** Fixes where one kanji's reading lies in the kana (from matchWord). */
export interface Pin {
  index: number;
  span: [number, number];
}

interface Run {
  kind: "kanji" | "kana" | "other";
  text: string;
  index: number;
}

function runsOf(expression: string): Run[] {
  const runs: Run[] = [];
  [...expression].forEach((c, i) => {
    const kind = KANJI.test(c) ? "kanji" : KANA.test(c) ? "kana" : "other";
    const last = runs.at(-1);
    if (last && last.kind === kind && kind !== "other") last.text += c;
    else runs.push({ kind, text: c, index: i });
  });
  return runs;
}

/** Every reading form a kanji can take inside a word, longest first. */
function variantsOf(char: string, prev: string | undefined, lookup: Lookup): string[] | null {
  // 々 repeats the kanji before it (人々 = ひとびと).
  const entry = lookup(char === "々" && prev ? prev : char);
  if (!entry) return null;
  const all = new Set(readingsOf(entry).flatMap((r) => readingVariants(r.stem)));
  return [...all].filter(Boolean).sort((a, b) => b.length - a.length);
}

/** Ways to read a kanji run one kanji at a time, starting at `pos`. */
function* perChar(
  run: Run,
  kana: string,
  pos: number,
  lookup: Lookup,
  pin: Pin | undefined,
): Generator<{ segments: RubySegment[]; end: number }> {
  const chars = [...run.text];
  function* step(i: number, at: number, unknown: boolean): Generator<{ segments: RubySegment[]; end: number }> {
    if (i === chars.length) {
      yield { segments: [], end: at };
      return;
    }
    const index = run.index + i;
    const variants = variantsOf(chars[i], chars[i - 1], lookup);
    let options: number[];
    if (pin && pin.index === index) {
      options = pin.span[0] === at ? [pin.span[1] - pin.span[0]] : [];
    } else {
      if (variants) {
        options = variants.filter((v) => kana.startsWith(v, at)).map((v) => v.length);
      } else if (!unknown) {
        // One kanji we have no readings for: let it take what's left over.
        options = Array.from({ length: kana.length - at }, (_, n) => n + 1);
      } else options = [];
    }
    for (const len of options) {
      for (const rest of step(i + 1, at + len, unknown || !variants)) {
        yield {
          segments: [{ text: chars[i], ruby: kana.slice(at, at + len), index }, ...rest.segments],
          end: rest.end,
        };
      }
    }
  }
  yield* step(0, pos, false);
}

/** Ways to read a whole kanji run as one block, shortest first. */
function* wholeRun(run: Run, kana: string, pos: number) {
  for (let end = pos + 1; end <= kana.length; end++) {
    yield { segments: [{ text: run.text, ruby: kana.slice(pos, end), index: run.index }], end };
  }
}

export function furigana(
  expression: string,
  reading: string,
  lookup: Lookup,
  pin?: Pin,
): RubySegment[] {
  // First alternative, without usage notes like "(する)" or ～ markers.
  const kana = toHiragana(
    reading.split(";")[0].replace(/[(（][^)）]*[)）]/g, "").replace(/[～〜\s]/g, ""),
  );
  const runs = runsOf(expression);
  if (!runs.some((r) => r.kind === "kanji")) return [{ text: expression, index: 0 }];

  function* solve(r: number, pos: number): Generator<RubySegment[]> {
    if (r === runs.length) {
      if (pos === kana.length) yield [];
      return;
    }
    const run = runs[r];
    if (run.kind === "other") {
      for (const rest of solve(r + 1, pos)) yield [{ text: run.text, index: run.index }, ...rest];
      return;
    }
    if (run.kind === "kana") {
      const own = toHiragana(run.text);
      if (!kana.startsWith(own, pos)) return;
      for (const rest of solve(r + 1, pos + own.length))
        yield [{ text: run.text, index: run.index }, ...rest];
      return;
    }
    for (const way of perChar(run, kana, pos, lookup, pin))
      for (const rest of solve(r + 1, way.end)) yield [...way.segments, ...rest];
    for (const way of wholeRun(run, kana, pos))
      for (const rest of solve(r + 1, way.end)) yield [...way.segments, ...rest];
  }

  const found = solve(0, 0).next();
  return found.done ? [{ text: expression, ruby: kana, index: 0 }] : found.value;
}
