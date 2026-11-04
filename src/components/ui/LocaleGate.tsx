"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import { resolveLocale, setLocale } from "@/lib/strings";
import { useSettings } from "@/store/settings";

/**
 * Renders the app once the language is known (it's a stored setting), and
 * re-renders all of it when the language changes. The static HTML is empty
 * on purpose: the language isn't known at build time.
 */
export function LocaleGate({ children }: { children: ReactNode }) {
  const loaded = useSettings((s) => s.loaded);
  const language = useSettings((s) => s.language);
  const locale = loaded
    ? resolveLocale(language, typeof navigator === "undefined" ? [] : navigator.languages)
    : null;
  // Set before the children render so every `strings` read sees it.
  if (locale) setLocale(locale);

  useEffect(() => {
    if (locale) document.documentElement.lang = locale;
  }, [locale]);

  if (!locale) return null;
  return <Fragment key={locale}>{children}</Fragment>;
}
