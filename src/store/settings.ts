import { create } from "zustand";
import { getSetting, setSetting } from "@/lib/db/repo";
import { DEFAULT_LIMITS, type SessionLimits } from "@/lib/srs/queue";
import type { Strictness } from "@/lib/strokes/compare";
import type { LanguageSetting } from "@/lib/strings";

export type Handedness = "right" | "left";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  language: LanguageSetting;
  strictness: Strictness;
  /** Which side the writing controls sit on. */
  handedness: Handedness;
  theme: Theme;
  /** Speak kana and words aloud when they're shown. */
  autoplayAudio: boolean;
  limits: SessionLimits;
  /** The "How Japanese works" welcome was finished or skipped. */
  welcomeSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "system",
  strictness: "normal",
  handedness: "right",
  theme: "system",
  autoplayAudio: true,
  limits: DEFAULT_LIMITS,
  welcomeSeen: false,
};

const KEY = "settings";

interface SettingsState extends Settings {
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => void;
}

/** User settings, stored as one row in the Dexie settings table. */
export const useSettings = create<SettingsState>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const stored = await getSetting<Partial<Settings>>(KEY, {});
    set({
      ...pickSettings({ ...DEFAULT_SETTINGS, ...stored }),
      limits: { reviews: stored.limits?.reviews ?? DEFAULT_LIMITS.reviews },
      loaded: true,
    });
  },

  update: (patch) => {
    // Saving before load() would replace the stored settings with defaults.
    if (!get().loaded) return;
    set(patch);
    setSetting(KEY, pickSettings(get())).catch(console.error);
  },
}));

export function pickSettings(s: Settings): Settings {
  return {
    language: s.language,
    strictness: s.strictness,
    handedness: s.handedness,
    theme: s.theme,
    autoplayAudio: s.autoplayAudio,
    limits: s.limits,
    welcomeSeen: s.welcomeSeen,
  };
}
