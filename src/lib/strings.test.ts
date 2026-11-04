import { afterEach, describe, expect, it } from "vitest";
import { en } from "./i18n/en";
import { it as itStrings } from "./i18n/it";
import { resolveLocale, setLocale, strings } from "./strings";

afterEach(() => setLocale("en"));

/** Every leaf key path of a strings object, functions included. */
function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("strings", () => {
  it("reads the current language", () => {
    expect(strings.path.due(3)).toBe("3 to review");
    setLocale("it");
    expect(strings.path.due(3)).toBe("3 da ripassare");
    expect(strings.path.due(1)).toBe("1 da ripassare");
  });

  it("has the same keys in every language", () => {
    expect(keys(itStrings)).toEqual(keys(en));
  });

  it("has no empty Italian strings except optional notes", () => {
    const empty = keys(itStrings).filter((k) => {
      const v = k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], itStrings);
      return v === "";
    });
    expect(empty).toEqual([]);
  });
});

describe("resolveLocale", () => {
  it("uses the explicit setting", () => {
    expect(resolveLocale("it", ["en-US"])).toBe("it");
  });

  it("follows the device for 'system', falling back to English", () => {
    expect(resolveLocale("system", ["it-IT", "en"])).toBe("it");
    expect(resolveLocale("system", ["fr-FR", "en-GB"])).toBe("en");
    expect(resolveLocale("system", ["de"])).toBe("en");
  });
});
