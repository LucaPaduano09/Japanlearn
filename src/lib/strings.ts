import { en, type Strings } from "./i18n/en";
import { it } from "./i18n/it";

/** UI languages. Content (kanji and word meanings) is English for now. */
export const LOCALES = ["en", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export type LanguageSetting = "system" | Locale;

const dictionaries: Record<Locale, Strings> = { en, it };
let current: Locale = "en";

export function setLocale(locale: Locale) {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** The setting's language, or the device's when it's "system" (English otherwise). */
export function resolveLocale(
  setting: LanguageSetting,
  deviceLanguages: readonly string[],
): Locale {
  if (setting !== "system") return setting;
  for (const lang of deviceLanguages) {
    const base = lang.toLowerCase().split("-")[0];
    if ((LOCALES as readonly string[]).includes(base)) return base as Locale;
  }
  return "en";
}

/**
 * All UI strings, in the current language. Read them while rendering (never
 * keep a section in a module-level constant): LocaleGate re-renders the app
 * when the language changes.
 */
export const strings: Strings = new Proxy({} as Strings, {
  get: (_, key) => dictionaries[current][key as keyof Strings],
});
