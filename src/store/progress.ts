import { create } from "zustand";
import { allItems, getSetting, introduceItem, setSetting } from "@/lib/db/repo";
import { cardTypesFor, type StudyItem } from "@/lib/srs/decks";
import type { CharacterGrade } from "@/lib/strokes/compare";

interface LearnedKanji {
  /** When the lesson for it was first finished (ms since epoch). */
  at: number;
  /** Grade of the last from-memory attempt. */
  grade: CharacterGrade;
}

interface ProgressState {
  /** False until load() has read Dexie (the static HTML renders empty). */
  loaded: boolean;
  load: () => Promise<void>;
  learned: Record<string, LearnedKanji>;
  /** Finishing a kanji in a lesson also creates its SRS cards. */
  markLearned: (char: string, grade: CharacterGrade) => void;
  /** Whether the "How kanji are read" intro was finished once. */
  introSeen: boolean;
  markIntroSeen: () => void;
}

/** Before M4, progress lived in localStorage under this key. */
const LEGACY_KEY = "kakitai-progress";
const KANJI_TYPES = cardTypesFor({ deckId: "kanji-n5" } as StudyItem);

/** Kanji lesson progress, backed by the Dexie items table. */
export const useProgress = create<ProgressState>()((set, get) => ({
  loaded: false,
  learned: {},
  introSeen: false,

  load: async () => {
    await migrateLegacy();
    const [items, introSeen] = await Promise.all([
      allItems(),
      getSetting("introSeen", false),
    ]);
    const learned: Record<string, LearnedKanji> = {};
    for (const i of items) {
      if (i.deckId === "kanji-n5") {
        learned[i.itemId] = { at: i.introducedAt, grade: i.grade };
      }
    }
    set({ loaded: true, learned, introSeen });
  },

  markLearned: (char, grade) => {
    const at = get().learned[char]?.at ?? Date.now();
    set((s) => ({ learned: { ...s.learned, [char]: { at, grade } } }));
    introduceItem("kanji-n5", char, KANJI_TYPES, grade).catch(console.error);
  },

  markIntroSeen: () => {
    set({ introSeen: true });
    setSetting("introSeen", true).catch(console.error);
  },
}));

/** Moves localStorage progress (M2/M3 builds) into Dexie, once. */
async function migrateLegacy() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const { state } = JSON.parse(raw) as {
      state: {
        learned?: Record<string, LearnedKanji>;
        introSeen?: boolean;
      };
    };
    for (const [char, { at, grade }] of Object.entries(state.learned ?? {})) {
      await introduceItem("kanji-n5", char, KANJI_TYPES, grade, at);
    }
    if (state.introSeen) await setSetting("introSeen", true);
  } catch (err) {
    console.error("Could not migrate old progress", err);
  }
  localStorage.removeItem(LEGACY_KEY);
}
