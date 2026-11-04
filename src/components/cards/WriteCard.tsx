"use client";

import { Prompt, writePrompt } from "@/components/cards/Prompt";
import { WordWriter } from "@/components/writing/WordWriter";
import type { StudyItem } from "@/lib/srs/decks";
import type { CharacterTally, Strictness } from "@/lib/strokes/compare";

/** Prompt (meaning or reading) → write the item from memory → graded tally. */
export function WriteCard({
  item,
  type,
  strictness,
  onAnswer,
}: {
  item: StudyItem;
  type: "write-from-meaning" | "write-from-reading";
  strictness: Strictness;
  onAnswer: (tally: CharacterTally) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Prompt {...writePrompt(item, type)} />
      <WordWriter
        chars={item.chars}
        mode="recall"
        strictness={strictness}
        onComplete={onAnswer}
      />
    </div>
  );
}
