import { describe, expect, it } from "vitest";
import { toRomaji } from "./romaji";

describe("toRomaji", () => {
  it.each([
    ["ひ", "hi"],
    ["にち", "nichi"],
    ["ニチ", "nichi"],
    ["ジツ", "jitsu"],
    ["いちにち", "ichinichi"],
    ["きょう", "kyou"],
    ["しゃしん", "shashin"],
    ["チョウ", "chou"],
    ["がっこう", "gakkou"],
    ["まっちゃ", "matcha"],
    ["きんえん", "kin'en"],
    ["こんや", "kon'ya"],
    ["さんぽ", "sanpo"],
    ["コーヒー", "koohii"],
    ["パーティー", "paatii"],
    ["を", "o"],
    ["づ", "zu"],
  ])("%s → %s", (kana, romaji) => {
    expect(toRomaji(kana)).toBe(romaji);
  });

  it("passes KANJIDIC markers through", () => {
    expect(toRomaji("やす(い)")).toBe("yasu(i)");
    expect(toRomaji("ひと-")).toBe("hito-");
    expect(toRomaji("-び")).toBe("-bi");
  });
});
