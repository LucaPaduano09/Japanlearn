"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { MicButton, SpeechStatus, useSpeechCheck } from "@/components/cards/speech";
import { SecondaryButton } from "@/components/ui/Button";
import { speak } from "@/lib/native/tts";
import type { ReadingIndex } from "@/lib/speech/match";
import type { StudyItem } from "@/lib/srs/decks";
import type { CharacterGrade } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

/** Tries before the card counts as missed. */
const ATTEMPTS = 3;
/** How long a right answer stays before the result screen. */
const REVEAL_MS = 900;

/** Shows a kana or word → the learner reads it aloud → the recognizer checks it. */
export function SpeakCard({
  item,
  index,
  autoplayAudio,
  onAnswer,
  onSkip,
}: {
  item: StudyItem;
  /** Other words' readings, so a homophone spelled differently still counts. */
  index: ReadingIndex;
  autoplayAudio: boolean;
  onAnswer: (grade: CharacterGrade, mistakes: number) => void;
  /** "Can't speak now": leave the spoken cards for later. */
  onSkip: () => void;
}) {
  const t = strings.review.speak;
  const [misses, setMisses] = useState(0);
  const [heardModel, setHeardModel] = useState(false);
  const onAnswerRef = useRef(onAnswer);
  useEffect(() => {
    onAnswerRef.current = onAnswer;
  });
  const { phase, toggle, cancel } = useSpeechCheck(item, index, (ok) => {
    if (ok) {
      if (autoplayAudio) speak(item.reading);
      return;
    }
    const n = misses + 1;
    setMisses(n);
    if (n >= ATTEMPTS) onAnswerRef.current("again", n);
  });

  useEffect(() => {
    if (phase.kind !== "right") return;
    // Retries or listening first: known, but not well yet.
    const grade = misses > 0 || heardModel ? "hard" : "good";
    const id = setTimeout(
      () => onAnswerRef.current(grade, misses + (heardModel ? 1 : 0)),
      REVEAL_MS,
    );
    return () => clearTimeout(id);
  }, [phase.kind, misses, heardModel]);

  const listening = phase.kind === "listening";
  const done = phase.kind === "right";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-center text-sm text-muted">{strings.review.prompts.speak}</p>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-hand text-7xl leading-tight break-all">{item.chars.join("")}</p>
        {item.meaning && <p className="text-muted">{item.meaning}</p>}
      </div>

      <div className="flex flex-col items-center gap-3">
        <MicButton phase={phase} onClick={toggle} disabled={done} />
        <SpeechStatus phase={phase} extra={t.attemptsLeft(ATTEMPTS - misses)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SecondaryButton
          onClick={() => {
            setHeardModel(true);
            speak(item.reading);
          }}
          disabled={listening || done}
          className="flex items-center justify-center gap-2"
        >
          <SpeakerIcon />
          {t.hear}
        </SecondaryButton>
        <SecondaryButton
          onClick={() => {
            cancel();
            onAnswer("again", misses + 1);
          }}
          disabled={done}
        >
          {t.dontKnow}
        </SecondaryButton>
      </div>
      <button
        type="button"
        onClick={() => {
          cancel();
          onSkip();
        }}
        disabled={done}
        className="text-sm text-muted underline-offset-4 active:opacity-70 disabled:opacity-40"
      >
        {t.cantNow}
      </button>
    </div>
  );
}
