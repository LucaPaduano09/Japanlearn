"use client";

import { useEffect, useRef, useState } from "react";
import { speak } from "@/lib/native/tts";
import { buzzMiss, tapOk } from "@/lib/native/haptics";
import type { StudyItem } from "@/lib/srs/decks";
import { recognizeAnswer } from "@/lib/srs/decks";
import { strings } from "@/lib/strings";

/** How long the right/wrong colors stay before moving on. */
const REVEAL_MS = 900;

/** Shows the item → pick its reading (kana) or meaning (kanji, words). */
export function RecognizeCard({
  item,
  choices,
  autoplayAudio,
  onAnswer,
}: {
  item: StudyItem;
  choices: string[];
  autoplayAudio: boolean;
  onAnswer: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answer = recognizeAnswer(item);
  const isKana = item.romaji !== undefined;

  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  });

  useEffect(() => {
    if (picked === null) return;
    const id = setTimeout(
      () => onAnswerRef.current(picked === answer),
      REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [picked, answer]);

  const pick = (choice: string) => {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === answer) tapOk();
    else buzzMiss();
    if (autoplayAudio) speak(item.reading);
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-center text-sm text-muted">
        {isKana
          ? strings.review.prompts.recognizeKana
          : strings.review.prompts.recognizeMeaning}
      </p>
      <p className="font-hand flex flex-1 items-center justify-center text-center text-8xl leading-tight break-all">
        {item.chars.join("")}
      </p>
      <ul className={`grid gap-3 ${isKana ? "grid-cols-2" : "grid-cols-1"}`}>
        {choices.map((c) => {
          const state =
            picked === null
              ? "idle"
              : c === answer
                ? "right"
                : c === picked
                  ? "wrong"
                  : "idle";
          return (
            <li key={c}>
              <button
                type="button"
                onClick={() => pick(c)}
                disabled={picked !== null}
                aria-pressed={picked === c}
                className={`w-full rounded-2xl border px-4 py-4 text-lg font-medium active:opacity-70 ${
                  state === "right"
                    ? "border-kun bg-kun-soft text-kun"
                    : state === "wrong"
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "border-border bg-surface"
                }`}
              >
                {c}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="h-5 text-center text-sm" aria-live="polite">
        {picked !== null &&
          (picked === answer ? strings.review.correct : strings.review.wrong)}
      </p>
    </div>
  );
}
