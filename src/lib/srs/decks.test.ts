import { existsSync } from "node:fs";
import kana from "../../../public/data/kana.json";
import kanji from "../../../public/data/kanji-n5.json";
import vocab from "../../../public/data/vocab-n5.json";
import kanjiN4 from "../../../public/data/kanji-n4.json";
import vocabN4 from "../../../public/data/vocab-n4.json";
import { describe, expect, it } from "vitest";
import type { Content } from "./decks";
import {
  buildDecks,
  cardId,
  cardTypesFor,
  kanjiReading,
  recognizeAnswer,
} from "./decks";
import { charToCodepointHex } from "@/lib/strokes/codepoint";

const content = { kana, kanji, vocab, kanjiN4, vocabN4 } as Content;
const decks = buildDecks(content);

describe("buildDecks", () => {
  it("has 71 hiragana and 71 katakana in gojūon order", () => {
    expect(decks.hiragana).toHaveLength(71);
    expect(decks.katakana).toHaveLength(71);
    expect(decks.hiragana.slice(0, 5).map((i) => i.id)).toEqual([
      ..."あいうえお",
    ]);
    expect(decks.katakana[0]).toMatchObject({ id: "ア", romaji: "a" });
  });

  it("disambiguates kana that share a romaji", () => {
    const byId = new Map(decks.hiragana.map((i) => [i.id, i]));
    expect(byId.get("じ")!.romaji).toBe("ji (from shi)");
    expect(byId.get("ぢ")!.romaji).toBe("ji (from chi)");
    expect(byId.get("づ")!.romaji).toBe("zu (from tsu)");
    expect(byId.get("か")!.romaji).toBe("ka");
  });

  it("orders kanji like the lessons, starting with numbers", () => {
    expect(decks["kanji-n5"]).toHaveLength(kanji.length);
    expect(decks["kanji-n5"].slice(0, 3).map((i) => i.id)).toEqual([
      ..."一二三",
    ]);
  });

  it("keeps only writable vocab, N5-only words first, without ～ or variants", () => {
    const words = decks["vocab-n5"];
    expect(words.length).toBeGreaterThan(600);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    for (const w of words) expect(w.id).not.toMatch(/[～; ]/);
    expect(words[0].extraKanji).toBe(0);
    expect(words.find((w) => w.id === "足")).toBeDefined();
    expect(words.find((w) => w.id === "円")?.reading).toBe("えん");
  });

  it("only uses characters that have stroke data", () => {
    const chars = new Set(
      Object.values(decks).flatMap((items) => items.flatMap((i) => i.chars)),
    );
    for (const c of chars) {
      expect(
        existsSync(`public/data/strokes/${charToCodepointHex(c)}.json`),
        c,
      ).toBe(true);
    }
  });
});

describe("kanjiReading", () => {
  it("joins the first on'yomi and kun'yomi in hiragana", () => {
    const hi = kanji.find((k) => k.char === "日")!;
    expect(kanjiReading(hi)).toBe("にち / ひ");
  });
});

describe("cardTypesFor", () => {
  it("gives kana a writing, an audio and a recognize card", () => {
    expect(cardTypesFor(decks.hiragana[0])).toEqual([
      "write-from-reading",
      "write-from-audio",
      "recognize",
    ]);
  });

  it("skips audio for kana that sound like another one", () => {
    const di = decks.hiragana.find((i) => i.id === "ぢ")!;
    expect(cardTypesFor(di)).not.toContain("write-from-audio");
  });

  it("prompts words with kanji by reading, kana-only words by audio", () => {
    const words = decks["vocab-n5"];
    const withKanji = words.find((w) => w.id === "食べる")!;
    const kanaOnly = words.find((w) => w.id === "ああ")!;
    expect(cardTypesFor(withKanji)).toContain("write-from-reading");
    expect(cardTypesFor(kanaOnly)).toContain("write-from-audio");
  });

  it("has words, and only words, read aloud", () => {
    expect(cardTypesFor(decks["vocab-n5"][0])).toContain("speak");
    expect(cardTypesFor(decks["vocab-n4"][0])).toContain("speak");
    expect(cardTypesFor(decks.hiragana[0])).not.toContain("speak");
    expect(cardTypesFor(decks["kanji-n5"][0])).not.toContain("speak");
  });
});

describe("ids and answers", () => {
  it("builds stable card ids", () => {
    expect(cardId("hiragana", "あ", "recognize")).toBe("hiragana|あ|recognize");
  });

  it("asks romaji for kana and meaning for kanji", () => {
    expect(recognizeAnswer(decks.hiragana[0])).toBe("a");
    expect(recognizeAnswer(decks["kanji-n5"][0])).toBe(
      decks["kanji-n5"][0].meaning,
    );
  });
});
