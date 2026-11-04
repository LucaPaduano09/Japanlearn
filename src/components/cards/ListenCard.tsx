"use client";

import { useEffect } from "react";
import { WordWriter } from "@/components/writing/WordWriter";
import { speak } from "@/lib/native/tts";
import type { StudyItem } from "@/lib/srs/decks";
import type { CharacterTally, Strictness } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

/** Plays the item aloud → write what you hear. */
export function ListenCard({
  item,
  strictness,
  onAnswer,
}: {
  item: StudyItem;
  strictness: Strictness;
  onAnswer: (tally: CharacterTally) => void;
}) {
  useEffect(() => {
    speak(item.reading);
  }, [item.reading]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted">{strings.review.prompts.listen}</p>
        <button
          type="button"
          onClick={() => speak(item.reading)}
          aria-label={strings.review.listen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white active:opacity-80"
        >
          <SpeakerIcon />
        </button>
      </div>
      <WordWriter
        chars={item.chars}
        mode="recall"
        strictness={strictness}
        onComplete={onAnswer}
      />
    </div>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
