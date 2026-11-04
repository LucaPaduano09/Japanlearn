import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CharacterGrade } from "@/lib/strokes/compare";

interface LearnedKanji {
  /** When the lesson for it was last finished (ms since epoch). */
  at: number;
  /** Grade of the last from-memory attempt. */
  grade: CharacterGrade;
}

interface ProgressState {
  learned: Record<string, LearnedKanji>;
  markLearned: (char: string, grade: CharacterGrade) => void;
  /** Whether the "How kanji are read" intro was finished once. */
  introSeen: boolean;
  markIntroSeen: () => void;
}

/**
 * Which kanji the learner has gone through in the lessons. Kept in
 * localStorage for now; M4 moves progress to Dexie alongside the SRS cards.
 */
export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      learned: {},
      introSeen: false,
      markIntroSeen: () => set({ introSeen: true }),
      markLearned: (char, grade) =>
        set((s) => ({
          learned: { ...s.learned, [char]: { at: Date.now(), grade } },
        })),
    }),
    {
      name: "kakitai-progress",
      storage: createJSONStorage(() => localStorage),
      // The static HTML renders with empty progress; pages call
      // useProgress.persist.rehydrate() in an effect after hydration.
      skipHydration: true,
    },
  ),
);
