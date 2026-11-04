import { describe, expect, it } from "vitest";
import { charToCodepointHex } from "./codepoint";

describe("charToCodepointHex", () => {
  it("matches known KanjiVG filenames", () => {
    expect(charToCodepointHex("日")).toBe("065e5");
    expect(charToCodepointHex("学")).toBe("05b66");
    expect(charToCodepointHex("あ")).toBe("03042");
    expect(charToCodepointHex("ン")).toBe("030f3");
  });

  it("throws on an empty string", () => {
    expect(() => charToCodepointHex("")).toThrow();
  });
});
