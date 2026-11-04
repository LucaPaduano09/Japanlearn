import kana from "../../../public/data/kana.json";
import kanji from "../../../public/data/kanji-n5.json";
import vocab from "../../../public/data/vocab-n5.json";
import { describe, expect, it } from "vitest";
import { buildDecks, itemKey, type Content } from "@/lib/srs/decks";
import {
  buildPath,
  KANJI_PER_STAGE,
  pathProgress,
  resumeIndex,
  rewardMeaning,
  rowBreakdown,
  toKatakana,
  voicedBase,
} from "./stages";

const decks = buildDecks({ kana, kanji, vocab } as Content);
const path = buildPath(decks["vocab-n5"]);

describe("buildPath", () => {
  it("goes hiragana → katakana → kanji → words", () => {
    const order = [...new Set(path.map((s) => s.section))];
    expect(order).toEqual(["hiragana", "katakana", "kanji", "words"]);
    expect(path[0]).toMatchObject({ id: "hira-1", items: [..."あいうえお"] });
    expect(path[1].items).toEqual([..."かきくけこ"]);
  });

  it("has unique stage ids", () => {
    expect(new Set(path.map((s) => s.id)).size).toBe(path.length);
  });

  it("covers every deck item exactly once", () => {
    for (const deckId of ["hiragana", "katakana", "kanji-n5", "vocab-n5"] as const) {
      const inPath = path.filter((s) => s.deckId === deckId).flatMap((s) => s.items);
      expect(new Set(inPath).size, deckId).toBe(inPath.length);
      expect([...inPath].sort(), deckId).toEqual(decks[deckId].map((i) => i.id).sort());
    }
  });

  it("keeps kanji stages small", () => {
    for (const s of path.filter((s) => s.section === "kanji")) {
      expect(s.items.length).toBeLessThanOrEqual(KANJI_PER_STAGE);
    }
    expect(path.find((s) => s.section === "kanji")!.intro).toMatchObject({ first: true });
  });

  it("only rewards kana stages with words made of kana learned so far", () => {
    for (const section of ["hiragana", "katakana"] as const) {
      const known = new Set<string>();
      for (const stage of path.filter((s) => s.section === section)) {
        stage.items.forEach((c) => known.add(c));
        for (const r of stage.rewards) {
          for (const c of r.word) expect(known.has(c), `${stage.id}: ${r.word}`).toBe(true);
        }
      }
    }
  });

  it("gives every hiragana stage a word to read", () => {
    for (const stage of path.filter((s) => s.section === "hiragana")) {
      expect(stage.rewards.length, stage.id).toBeGreaterThan(0);
    }
  });

  it("rewards kanji stages with words that use only kanji known by then", () => {
    const known = new Set<string>();
    for (const stage of path.filter((s) => s.section === "kanji")) {
      stage.items.forEach((c) => known.add(c));
      for (const r of stage.rewards) {
        for (const c of r.word) {
          if (/[一-鿿]/u.test(c)) expect(known.has(c), `${stage.id}: ${r.word}`).toBe(true);
        }
      }
    }
  });
});

describe("pathProgress", () => {
  it("marks finished stages done, the next one current, the rest locked", () => {
    const introduced = new Set([..."あいうえおかき"].map((c) => itemKey("hiragana", c)));
    const progress = pathProgress(path, introduced);
    expect(progress[0]).toMatchObject({ status: "done", done: 5 });
    expect(progress[1]).toMatchObject({ status: "current", done: 2 });
    expect(progress[2].status).toBe("locked");
  });

  it("starts at the first stage", () => {
    expect(pathProgress(path, new Set())[0].status).toBe("current");
  });
});

describe("resumeIndex", () => {
  it("resumes at the first item not learned, or restarts a finished stage", () => {
    const k = path[1];
    expect(resumeIndex(k, new Set([itemKey("hiragana", "か")]))).toBe(1);
    expect(resumeIndex(k, new Set(k.items.map((c) => itemKey("hiragana", c))))).toBe(0);
  });
});

describe("rowBreakdown", () => {
  it("splits consonant and vowel and flags irregular readings", () => {
    const s = kana.filter((k) => "さしすせそ".includes(k.char) && k.kind === "hiragana");
    const parts = rowBreakdown(s, "s");
    expect(parts.map((p) => p.vowel)).toEqual(["a", "i", "u", "e", "o"]);
    expect(parts.filter((p) => p.irregular).map((p) => p.char)).toEqual(["し"]);
  });
});

describe("kana helpers", () => {
  it("converts hiragana to katakana", () => {
    expect(toKatakana("かきくけこ")).toBe("カキクケコ");
  });

  it("finds the plain kana behind ゛ and ゜", () => {
    expect(voicedBase("が")).toBe("か");
    expect(voicedBase("ぱ", true)).toBe("は");
    expect(voicedBase("パ", true)).toBe("ハ");
  });

  it("picks the reward meaning in the UI language", () => {
    expect(rewardMeaning(path[0].rewards[0], "it")).toBe("amore");
    expect(rewardMeaning(path[0].rewards[0], "en")).toBe("love");
    expect(rewardMeaning({ word: "x", meaning: "data" }, "it")).toBe("data");
  });
});
