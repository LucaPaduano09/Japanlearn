import kanji from "../../../public/data/kanji-n5.json";
import { describe, expect, it } from "vitest";
import { LESSONS } from "./lessons";

describe("LESSONS", () => {
  it("covers every N5 kanji exactly once", () => {
    const taught = LESSONS.flatMap((l) => l.kanji);
    expect(new Set(taught).size).toBe(taught.length);
    expect([...taught].sort()).toEqual(kanji.map((k) => k.char).sort());
  });

  it("has unique ids", () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });
});
