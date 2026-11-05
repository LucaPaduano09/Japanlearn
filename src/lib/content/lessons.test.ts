import kanji from "../../../public/data/kanji-n5.json";
import kanjiN4 from "../../../public/data/kanji-n4.json";
import { describe, expect, it } from "vitest";
import { LESSONS, LESSONS_N4 } from "./lessons";

describe("LESSONS", () => {
  it("covers every N5 kanji exactly once", () => {
    const taught = LESSONS.flatMap((l) => l.kanji);
    expect(new Set(taught).size).toBe(taught.length);
    expect([...taught].sort()).toEqual(kanji.map((k) => k.char).sort());
  });

  it("has unique ids", () => {
    const all = [...LESSONS, ...LESSONS_N4];
    expect(new Set(all.map((l) => l.id)).size).toBe(all.length);
    expect(new Set(all.map((l) => l.title)).size).toBe(all.length);
  });
});

describe("LESSONS_N4", () => {
  it("covers every N4 kanji exactly once", () => {
    const taught = LESSONS_N4.flatMap((l) => l.kanji);
    expect(new Set(taught).size).toBe(taught.length);
    expect([...taught].sort()).toEqual(kanjiN4.map((k) => k.char).sort());
  });
});
