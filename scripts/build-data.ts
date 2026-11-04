/**
 * Downloads and parses the content datasets into public/data:
 *  - kana.json: hiragana + katakana (46 + dakuten/handakuten), hardcoded.
 *  - kanji-n5.json: readings/meanings for JLPT N5 kanji, from KANJIDIC2's
 *    legacy jlpt="4" tag (pre-2010 4-kyuu). That old level has the same 103
 *    kanji as today's N5, and it's the only JLPT tag KANJIDIC2 ships.
 *  - vocab-n5.json: ~700 N5 words from elzup/jlpt-word-list (MIT), since
 *    JMdict dropped JLPT tags after the 2010 level revision.
 *  - strokes/<codepoint-hex>.json: KanjiVG stroke paths for every kana and
 *    N5 kanji character, resampled to evenly spaced points.
 *
 * Attribution (must stay in the shipped Credits screen):
 *  - KanjiVG (c) Ulrich Apel, CC BY-SA 3.0 - https://kanjivg.tagaini.net
 *  - KANJIDIC2 (c) EDRDG, CC BY-SA 4.0 - https://www.edrdg.org
 *  - jlpt-word-list (c) elzup, MIT - https://github.com/elzup/jlpt-word-list
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { svgPathProperties } from "svg-path-properties";
import { charToCodepointHex } from "../src/lib/strokes/codepoint";

const ROOT = path.join(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const CACHE_DIR = path.join(ROOT, ".cache", "build-data");

const KANJIVG_BASE = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";
const KANJIDIC2_URL = "http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz";
const JLPT_N5_VOCAB_URL = "https://raw.githubusercontent.com/elzup/jlpt-word-list/master/src/n5.csv";

const STROKE_SAMPLES = 24; // points per stroke, evenly spaced by arc length
const FETCH_CONCURRENCY = 8;

interface KanaRecord {
  char: string;
  romaji: string;
  kind: "hiragana" | "katakana";
}

interface KanjiRecord {
  char: string;
  strokeCount: number;
  grade: number | null;
  onYomi: string[];
  kunYomi: string[];
  meanings: string[];
}

interface VocabRecord {
  expression: string;
  reading: string;
  meaning: string;
}

type RefStroke = [number, number][];

// --- kana (fixed syllabary, no external source needed) ---------------------

const HIRAGANA: { char: string; romaji: string }[] = [
  { char: "あ", romaji: "a" }, { char: "い", romaji: "i" }, { char: "う", romaji: "u" }, { char: "え", romaji: "e" }, { char: "お", romaji: "o" },
  { char: "か", romaji: "ka" }, { char: "き", romaji: "ki" }, { char: "く", romaji: "ku" }, { char: "け", romaji: "ke" }, { char: "こ", romaji: "ko" },
  { char: "さ", romaji: "sa" }, { char: "し", romaji: "shi" }, { char: "す", romaji: "su" }, { char: "せ", romaji: "se" }, { char: "そ", romaji: "so" },
  { char: "た", romaji: "ta" }, { char: "ち", romaji: "chi" }, { char: "つ", romaji: "tsu" }, { char: "て", romaji: "te" }, { char: "と", romaji: "to" },
  { char: "な", romaji: "na" }, { char: "に", romaji: "ni" }, { char: "ぬ", romaji: "nu" }, { char: "ね", romaji: "ne" }, { char: "の", romaji: "no" },
  { char: "は", romaji: "ha" }, { char: "ひ", romaji: "hi" }, { char: "ふ", romaji: "fu" }, { char: "へ", romaji: "he" }, { char: "ほ", romaji: "ho" },
  { char: "ま", romaji: "ma" }, { char: "み", romaji: "mi" }, { char: "む", romaji: "mu" }, { char: "め", romaji: "me" }, { char: "も", romaji: "mo" },
  { char: "や", romaji: "ya" }, { char: "ゆ", romaji: "yu" }, { char: "よ", romaji: "yo" },
  { char: "ら", romaji: "ra" }, { char: "り", romaji: "ri" }, { char: "る", romaji: "ru" }, { char: "れ", romaji: "re" }, { char: "ろ", romaji: "ro" },
  { char: "わ", romaji: "wa" }, { char: "を", romaji: "wo" },
  { char: "ん", romaji: "n" },
  { char: "が", romaji: "ga" }, { char: "ぎ", romaji: "gi" }, { char: "ぐ", romaji: "gu" }, { char: "げ", romaji: "ge" }, { char: "ご", romaji: "go" },
  { char: "ざ", romaji: "za" }, { char: "じ", romaji: "ji" }, { char: "ず", romaji: "zu" }, { char: "ぜ", romaji: "ze" }, { char: "ぞ", romaji: "zo" },
  { char: "だ", romaji: "da" }, { char: "ぢ", romaji: "ji" }, { char: "づ", romaji: "zu" }, { char: "で", romaji: "de" }, { char: "ど", romaji: "do" },
  { char: "ば", romaji: "ba" }, { char: "び", romaji: "bi" }, { char: "ぶ", romaji: "bu" }, { char: "べ", romaji: "be" }, { char: "ぼ", romaji: "bo" },
  { char: "ぱ", romaji: "pa" }, { char: "ぴ", romaji: "pi" }, { char: "ぷ", romaji: "pu" }, { char: "ぺ", romaji: "pe" }, { char: "ぽ", romaji: "po" },
];

/** Katakana mirrors hiragana one-for-one, offset by a fixed codepoint delta. */
const KATAKANA_OFFSET = 0x60;

function buildKana(): KanaRecord[] {
  const hiragana = HIRAGANA.map((k) => ({ ...k, kind: "hiragana" as const }));
  const katakana = HIRAGANA.map((k) => ({
    char: String.fromCodePoint(k.char.codePointAt(0)! + KATAKANA_OFFSET),
    romaji: k.romaji,
    kind: "katakana" as const,
  }));
  return [...hiragana, ...katakana];
}

// --- networking (cached to .cache/build-data so reruns are fast) -----------

async function fetchCachedText(url: string, cacheName: string): Promise<string> {
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) return readFile(cachePath, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const text = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, text, "utf8");
  return text;
}

async function fetchCachedGunzipText(url: string, cacheName: string): Promise<string> {
  const cachePath = path.join(CACHE_DIR, cacheName);
  if (existsSync(cachePath)) return readFile(cachePath, "utf8");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = zlib.gunzipSync(buf).toString("utf8");
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, text, "utf8");
  return text;
}

async function fetchKanjiVgSvg(hex: string): Promise<string | null> {
  const cachePath = path.join(CACHE_DIR, "kanjivg", `${hex}.svg`);
  if (existsSync(cachePath)) return readFile(cachePath, "utf8");
  const res = await fetch(`${KANJIVG_BASE}/${hex}.svg`);
  if (!res.ok) return null;
  const text = await res.text();
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, text, "utf8");
  return text;
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      await fn(items[next++]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// --- KANJIDIC2 (XML is regular enough for this to be simpler than a parser) ---

function parseKanjidic2(xml: string): KanjiRecord[] {
  const records: KanjiRecord[] = [];
  for (const block of xml.split("<character>").slice(1)) {
    const body = block.split("</character>")[0];
    if (body.match(/<jlpt>(\d)<\/jlpt>/)?.[1] !== "4") continue; // legacy 4-kyuu ≈ N5
    const literal = body.match(/<literal>([^<]+)<\/literal>/)?.[1];
    if (!literal) continue;
    const gradeMatch = body.match(/<grade>(\d+)<\/grade>/)?.[1];
    records.push({
      char: literal,
      strokeCount: Number(body.match(/<stroke_count>(\d+)<\/stroke_count>/)?.[1] ?? 0),
      grade: gradeMatch ? Number(gradeMatch) : null,
      onYomi: [...body.matchAll(/<reading r_type="ja_on">([^<]+)<\/reading>/g)].map((m) => m[1]),
      kunYomi: [...body.matchAll(/<reading r_type="ja_kun">([^<]+)<\/reading>/g)].map((m) => m[1]),
      meanings: [...body.matchAll(/<meaning>([^<]+)<\/meaning>/g)].map((m) => m[1]), // no m_lang = English
    });
  }
  return records;
}

// --- elzup/jlpt-word-list CSV (expression,reading,meaning,tags) -----------

/** Splits one CSV line; the source has no doubled "" escapes or embedded newlines. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  for (const c of line) {
    if (inQuotes) {
      if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      fields.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field);
  return fields;
}

function parseJlptVocabCsv(csv: string): VocabRecord[] {
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(1).map((line) => {
    const [expression, reading, meaning] = splitCsvLine(line);
    return { expression, reading, meaning };
  });
}

// --- KanjiVG stroke paths ----------------------------------------------------

function sampleStroke(d: string, viewBoxSize: number): RefStroke {
  const props = new svgPathProperties(d);
  const total = props.getTotalLength();
  const points: RefStroke = [];
  for (let i = 0; i < STROKE_SAMPLES; i++) {
    const { x, y } = props.getPointAtLength((total * i) / (STROKE_SAMPLES - 1));
    points.push([round3(x / viewBoxSize), round3(y / viewBoxSize)]);
  }
  return points;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Every <path id="kvg:...-sN"> in the file, in stroke order, regardless of group nesting. */
function parseKanjiVgSvg(svg: string): RefStroke[] | null {
  const viewBoxSize = Number(svg.match(/viewBox="0 0 ([\d.]+) /)?.[1] ?? 109);
  const strokes: { n: number; d: string }[] = [];
  for (const tag of svg.match(/<path\b[^>]*\/?>/g) ?? []) {
    const n = tag.match(/id="kvg:[\w-]*-s(\d+)"/)?.[1];
    const d = tag.match(/\sd="([^"]*)"/)?.[1];
    if (n && d) strokes.push({ n: Number(n), d });
  }
  if (strokes.length === 0) return null;
  strokes.sort((a, b) => a.n - b.n);
  return strokes.map((s) => sampleStroke(s.d, viewBoxSize));
}

// --- glue --------------------------------------------------------------------

async function writeJson(relPath: string, data: unknown): Promise<void> {
  const full = path.join(DATA_DIR, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data) + "\n", "utf8");
}

async function main() {
  console.log("Kana...");
  const kana = buildKana();
  await writeJson("kana.json", kana);
  console.log(`  ${kana.length} characters`);

  console.log("Kanji N5 (KANJIDIC2)...");
  const kanjidic2Xml = await fetchCachedGunzipText(KANJIDIC2_URL, "kanjidic2.xml");
  const kanji = parseKanjidic2(kanjidic2Xml);
  await writeJson("kanji-n5.json", kanji);
  console.log(`  ${kanji.length} kanji`);

  console.log("Vocab N5 (elzup/jlpt-word-list)...");
  const vocabCsv = await fetchCachedText(JLPT_N5_VOCAB_URL, "n5-vocab.csv");
  const vocab = parseJlptVocabCsv(vocabCsv);
  await writeJson("vocab-n5.json", vocab);
  console.log(`  ${vocab.length} words`);

  const chars = [...new Set([...kana.map((k) => k.char), ...kanji.map((k) => k.char)])];
  console.log(`Strokes (KanjiVG) for ${chars.length} characters...`);
  let written = 0;
  const missing: string[] = [];
  await mapWithConcurrency(chars, FETCH_CONCURRENCY, async (char) => {
    const hex = charToCodepointHex(char);
    const svg = await fetchKanjiVgSvg(hex);
    const strokes = svg && parseKanjiVgSvg(svg);
    if (!strokes) {
      missing.push(char);
      return;
    }
    await writeJson(`strokes/${hex}.json`, { char, strokes });
    written++;
  });
  console.log(`  ${written} written${missing.length ? `, missing: ${missing.join(" ")}` : ""}`);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
