import { create } from "zustand";
import { getSetting, setSetting } from "@/lib/db/repo";
import type { DeckId } from "@/lib/srs/decks";
import { DEFAULT_LIMITS, type SessionLimits } from "@/lib/srs/queue";
import type { Strictness } from "@/lib/strokes/compare";

export type Handedness = "right" | "left";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  strictness: Strictness;
  /** Which side the writing controls sit on. */
  handedness: Handedness;
  theme: Theme;
  /** Speak kana and words aloud when they're shown. */
  autoplayAudio: boolean;
  limits: SessionLimits;
  /** Decks that feed new items into review sessions. */
  activeDecks: DeckId[];
}

export const DEFAULT_SETTINGS: Settings = {
  strictness: "normal",
  handedness: "right",
  theme: "system",
  autoplayAudio: true,
  limits: DEFAULT_LIMITS,
  activeDecks: ["hiragana"],
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
      ...DEFAULT_SETTINGS,
      ...stored,
      limits: { ...DEFAULT_LIMITS, ...stored.limits },
      loaded: true,
    });
  },

  update: (patch) => {
    set(patch);
    setSetting(KEY, pickSettings(get())).catch(console.error);
  },
}));

export function pickSettings(s: Settings): Settings {
  return {
    strictness: s.strictness,
    handedness: s.handedness,
    theme: s.theme,
    autoplayAudio: s.autoplayAudio,
    limits: s.limits,
    activeDecks: s.activeDecks,
  };
}
