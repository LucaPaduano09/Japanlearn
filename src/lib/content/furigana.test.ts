import kanjiN4 from "../../../public/data/kanji-n4.json";
import kanjiN5 from "../../../public/data/kanji-n5.json";
import vocabN4 from "../../../public/data/vocab-n4.json";
import vocabN5 from "../../../public/data/vocab-n5.json";
import { describe, expect, it } from "vitest";
import { furigana } from "./furigana";
import type { KanjiEntry, VocabEntry } from "./types";
import { matchWord } from "./wordReadings";

const all = new Map([...kanjiN5, ...kanjiN4].map((k) => [k.char, k as KanjiEntry]));
const lookup = (c: string) => all.get(c);
/** "毎[まい]日[にち]" — compact form of the segments. */
const show = (expression: string, reading: string) =>
  furigana(expression, reading, lookup)
    .map((s) => (s.ruby ? `${s.text}[${s.ruby}]` : s.text))
    .join("");

describe("furigana", () => {
  it.each([
    ["毎日", "まいにち", "毎[まい]日[にち]"],
    ["日曜日", "にちようび", "日[にち]曜[よう]日[び]"],
    ["日", "ひ", "日[ひ]"],
    ["食べる", "たべる", "食[た]べる"],
    ["学校", "がっこう", "学[がっ]校[こう]"],
    ["お金", "おかね", "お金[かね]"],
    ["人々", "ひとびと", "人[ひと]々[びと]"],
    ["一ヶ月", "いっかげつ", "一[いっ]ヶ[か]月[げつ]"],
    ["～時", "じ", "～時[じ]"],
  ])("%s (%s) → %s", (expression, reading, expected) => {
    expect(show(expression, reading)).toBe(expected);
  });

  it("puts a whole-word reading over the whole run", () => {
    expect(show("明日", "あした")).toBe("明日[あした]");
    expect(show("大人", "おとな")).toBe("大人[おとな]");
  });

  it("leaves kana-only words without ruby", () => {
    expect(show("ここ", "ここ")).toBe("ここ");
  });

  it("follows a pinned reading", () => {
    const m = matchWord(all.get("日")!, { expression: "日曜日", reading: "にちようび", meaning: "" })!;
    const segs = furigana("日曜日", m.kana, lookup, { index: m.charIndex, span: m.span! });
    expect(segs[0]).toEqual({ text: "日", ruby: "にち", index: 0 });
  });

  it("always rebuilds the full reading, for every N5/N4 word", () => {
    for (const w of [...vocabN5, ...vocabN4] as VocabEntry[]) {
      const expression = w.expression.split(";")[0].trim();
      const reading = w.reading.split(";")[0].trim().replace(/[～〜]/g, "");
      const segs = furigana(expression, reading, lookup);
      expect(segs.map((s) => s.text).join("")).toBe(expression);
    }
  });
});

describe("furigana readings", () => {
  it("drops usage notes and alternatives from the reading", () => {
    expect(show("勉強", "べんきょう (する)")).toBe("勉[べん]強[きょう]");
    expect(show("日", "ひ;にち")).toBe("日[ひ]");
  });
});
