import { describe, expect, it } from "vitest";
import type { StudyItem } from "@/lib/srs/decks";
import {
  buildReadingIndex,
  kanjiNumber,
  matchSpoken,
  normalizeSpoken,
} from "./match";

const word = (written: string, reading: string): StudyItem => ({
  deckId: "vocab-n5",
  id: written,
  chars: [...written],
  reading,
});

describe("normalizeSpoken", () => {
  it("turns katakana into hiragana and keeps ー", () => {
    expect(normalizeSpoken("コーヒー")).toBe("こーひー");
  });

  it("drops punctuation, spaces and full-width forms", () => {
    expect(normalizeSpoken(" 猫。")).toBe("猫");
    expect(normalizeSpoken("ねこ、ねこ！")).toBe("ねこねこ");
    expect(normalizeSpoken("ｶﾞｽ")).toBe("がす");
  });

  it("writes digits as kanji numerals", () => {
    expect(normalizeSpoken("1つ")).toBe("一つ");
    expect(normalizeSpoken("1,000円")).toBe("千円");
  });
});

describe("kanjiNumber", () => {
  it.each([
    [0, "〇"],
    [1, "一"],
    [10, "十"],
    [11, "十一"],
    [20, "二十"],
    [105, "百五"],
    [300, "三百"],
    [1000, "千"],
    [8000, "八千"],
    [2026, "二千二十六"],
  ])("%i → %s", (n, kanji) => {
    expect(kanjiNumber(n)).toBe(kanji);
  });

  it("leaves numbers it can't write as digits", () => {
    expect(kanjiNumber(10000)).toBe("10000");
  });
});

describe("matchSpoken", () => {
  it("accepts the kana reading, in either script", () => {
    expect(matchSpoken(word("ねこ", "ねこ"), ["ねこ"]).ok).toBe(true);
    expect(matchSpoken(word("ねこ", "ねこ"), ["ネコ"]).ok).toBe(true);
  });

  it("accepts the word as written", () => {
    expect(matchSpoken(word("猫", "ねこ"), ["猫。"])).toEqual({ ok: true, heard: "猫。" });
    expect(matchSpoken(word("一つ", "ひとつ"), ["1つ"]).ok).toBe(true);
  });

  it("checks every alternative and reports the one that matched", () => {
    expect(matchSpoken(word("犬", "いぬ"), ["いる", "犬"])).toEqual({ ok: true, heard: "犬" });
  });

  it("accepts a homophone the recognizer spelled with other kanji", () => {
    const index = buildReadingIndex([word("紙", "かみ"), word("髪", "かみ")]);
    expect(matchSpoken(word("紙", "かみ"), ["髪"], index).ok).toBe(true);
  });

  it("rejects a different word and shows the likeliest transcript", () => {
    const index = buildReadingIndex([word("紙", "かみ"), word("神", "かみ")]);
    expect(matchSpoken(word("髪", "かみ"), ["上手", "紙"], index).ok).toBe(true);
    expect(matchSpoken(word("猫", "ねこ"), [" 根っこ ", "寝込"], index)).toEqual({
      ok: false,
      heard: "根っこ",
    });
  });

  it("hears a lone kana stretched, doubled, as romaji or as a one-sound word", () => {
    const a: StudyItem = { deckId: "hiragana", id: "あ", chars: ["あ"], reading: "あ", romaji: "a" };
    for (const heard of ["あ", "ああ", "あー", "アッ", "A"]) {
      expect(matchSpoken(a, [heard]).ok, heard).toBe(true);
    }
    expect(matchSpoken(a, ["か"]).ok).toBe(false);
    const me: StudyItem = { deckId: "hiragana", id: "め", chars: ["め"], reading: "め", romaji: "me" };
    expect(matchSpoken(me, ["目"], buildReadingIndex([word("目", "め")])).ok).toBe(true);
  });

  it("takes kana that sound alike as the same", () => {
    const di: StudyItem = {
      deckId: "hiragana",
      id: "ぢ",
      chars: ["ぢ"],
      reading: "ぢ",
      romaji: "ji (from chi)",
    };
    expect(matchSpoken(di, ["じ"]).ok).toBe(true);
    expect(matchSpoken(di, ["ji"]).ok).toBe(true);
    expect(matchSpoken(word("ちぢむ", "ちぢむ"), ["ちじむ"]).ok).toBe(true);
  });

  it("doesn't squash repeated sounds in words", () => {
    expect(matchSpoken(word("ここ", "ここ"), ["こ"]).ok).toBe(false);
  });

  it("rejects silence", () => {
    expect(matchSpoken(word("猫", "ねこ"), [])).toEqual({ ok: false, heard: "" });
  });
});
