import kanjiData from "../../../public/data/kanji-n5.json";
import vocab from "../../../public/data/vocab-n5.json";
import { describe, expect, it } from "vitest";
import type { KanjiEntry } from "./types";
import {
  lessonReadings,
  matchWord,
  parseReading,
  readingVariants,
} from "./wordReadings";

const kanji = (c: string) =>
  (kanjiData as KanjiEntry[]).find((k) => k.char === c)!;
const word = (expression: string, reading: string) => ({
  expression,
  reading,
  meaning: "",
});

describe("parseReading", () => {
  it("splits stem, okurigana and affix markers", () => {
    expect(parseReading("やす.い", "kun")).toMatchObject({
      stem: "やす",
      okurigana: "い",
    });
    expect(parseReading("-か", "kun")).toMatchObject({
      stem: "か",
      suffixOnly: true,
    });
    expect(parseReading("ニチ", "on")).toMatchObject({
      stem: "にち",
      okurigana: "",
    });
  });
});

describe("readingVariants", () => {
  it("adds rendaku and っ forms", () => {
    expect(readingVariants("がく")).toContain("がっ");
    expect(readingVariants("ひ")).toEqual(["ひ", "び", "ぴ"]);
  });
});

describe("matchWord", () => {
  const cases: [string, string, string, string, string | null][] = [
    // kanji, expression, reading, expected raw reading (null = special), highlighted kana
    ["日", "毎日", "まいにち", "ニチ", "にち"],
    ["日", "一日", "いちにち", "ニチ", "にち"],
    ["日", "五日", "いつか", "-か", "か"],
    ["日", "日", "ひ", "ひ", "ひ"],
    ["日", "火曜日", "かようび", "-び", "び"],
    ["学", "学校", "がっこう", "ガク", "がっ"],
    ["学", "大学", "だいがく", "ガク", "がく"],
    ["安", "安い", "やすい", "やす.い", "やす"],
    ["人", "外国人", "がいこくじん", "ジン", "じん"],
    ["生", "生まれる", "うまれる", "う.まれる", "う"],
    ["生", "先生", "せんせい", "セイ", "せい"],
    // The intro's examples
    ["山", "山", "やま", "やま", "やま"],
    ["食", "食べる", "たべる", "た.べる", "た"],
    ["高", "高い", "たかい", "たか.い", "たか"],
    ["電", "電車", "でんしゃ", "デン", "でん"],
    ["先", "先生", "せんせい", "セン", "せん"],
    ["名", "名前", "なまえ", "な", "な"],
    ["日", "日曜日", "にちようび", "ニチ", "にち"],
  ];
  it.each(cases)("%s in %s (%s) → %s", (c, expression, reading, raw, part) => {
    const m = matchWord(kanji(c), word(expression, reading))!;
    expect(m.reading?.raw).toBe(raw);
    expect(m.kana.slice(...m.span!)).toBe(part);
  });

  it("calls whole-word readings special", () => {
    expect(matchWord(kanji("日"), word("明日", "あした"))!.reading).toBeNull();
    expect(matchWord(kanji("人"), word("大人", "おとな"))!.reading).toBeNull();
  });

  it("ignores words without the kanji", () => {
    expect(matchWord(kanji("日"), word("月", "つき"))).toBeNull();
  });
});

describe("lessonReadings", () => {
  it("puts used readings first and collapses the rest (生)", () => {
    const r = lessonReadings(kanji("生"), vocab);
    expect(r.main.on.map((g) => g.reading.raw)).toContain("セイ");
    expect(r.main.kun.map((g) => g.reading.raw)).toContain("う.まれる");
    expect(r.other.length).toBeGreaterThan(10);
    for (const g of [...r.main.on, ...r.main.kun])
      expect(g.words.length).toBeLessThanOrEqual(2);
  });

  it("always keeps the first reading of each kind (日 → ひ, even with no word)", () => {
    const r = lessonReadings(kanji("日"), vocab);
    expect(r.main.kun[0].reading.raw).toBe("ひ");
    expect(r.main.on[0].reading.raw).toBe("ニチ");
  });

  it("lists special readings separately (日)", () => {
    const r = lessonReadings(kanji("日"), vocab);
    expect(r.special.length).toBeGreaterThan(0);
    expect(r.special.every((m) => m.reading === null)).toBe(true);
  });

  it("always shows at least one reading of each kind", () => {
    for (const k of kanjiData as KanjiEntry[]) {
      const r = lessonReadings(k, vocab);
      if (k.onYomi.length) expect(r.main.on.length, k.char).toBeGreaterThan(0);
      if (k.kunYomi.length)
        expect(r.main.kun.length, k.char).toBeGreaterThan(0);
    }
  });
});
