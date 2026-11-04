"use client";

import { useEffect } from "react";
import { hideSplash, setStatusBarDark } from "@/lib/native/shell";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { useSettings, type Theme } from "@/store/settings";

/**
 * Runs once per app start: loads settings, applies the theme to <html>
 * (and the native status bar), then hides the splash screen.
 */
export function AppShell() {
  const theme = useSettings((s) => s.theme);
  const loaded = useSettings((s) => s.loaded);

  useEffect(() => {
    useSettings.getState().load().finally(hideSplash);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    applyTheme(theme);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    scheme.addEventListener("change", onChange);
    return () => scheme.removeEventListener("change", onChange);
  }, [theme, loaded]);

  return null;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  setStatusBarDark(dark);
}
