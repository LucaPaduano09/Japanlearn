import { describe, expect, it } from "vitest";
import { teachableMeanings } from "./readings";

describe("teachableMeanings", () => {
  const base = {
    char: "一",
    strokeCount: 1,
    grade: 1,
    onYomi: [],
    kunYomi: [],
  };
  it("drops radical entries", () => {
    expect(
      teachableMeanings({ ...base, meanings: ["one", "one radical (no.1)"] }),
    ).toEqual(["one"]);
  });
  it("keeps them if nothing else is left", () => {
    expect(teachableMeanings({ ...base, meanings: ["mouth radical"] })).toEqual(
      ["mouth radical"],
    );
  });
});
