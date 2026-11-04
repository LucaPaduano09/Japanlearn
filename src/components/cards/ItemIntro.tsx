"use client";

import { useEffect, useState } from "react";
import { Prompt, writePrompt } from "@/components/cards/Prompt";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { KanjiMeet } from "@/components/learn/KanjiMeet";
import { PrimaryButton } from "@/components/ui/Button";
import { useStrokes } from "@/components/writing/useStrokes";
import { WatchStep } from "@/components/writing/WatchStep";
import { WordWriter } from "@/components/writing/WordWriter";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import { speak } from "@/lib/native/tts";
import type { StudyItem } from "@/lib/srs/decks";
import {
  gradeCharacter,
  type CharacterGrade,
  type Strictness,
} from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

const STEPS = ["meet", "watch", "trace", "recall"] as const;
type Step = (typeof STEPS)[number] | "result";

/**
 * A new item's short intro (BOOTSTRAP §7): meet it, watch the stroke order,
 * trace over the ghost, then write it from memory. The from-memory grade
 * seeds its SRS cards.
 */
export function ItemIntro({
  item,
  kanji,
  vocab,
  strictness,
  autoplayAudio,
  onLearned,
  onNext,
}: {
  item: StudyItem;
  /** For kanji items: the KANJIDIC entry shown in the meet step. */
  kanji?: KanjiEntry;
  vocab: VocabEntry[];
  strictness: Strictness;
  autoplayAudio: boolean;
  onLearned: (grade: CharacterGrade) => void;
  onNext: () => void;
}) {
  const [step, setStep] = useState<Step>("meet");
  const [grade, setGrade] = useState<CharacterGrade | null>(null);
  const strokes = useStrokes(item.chars);
  const recallType =
    item.deckId === "kanji-n5" || item.deckId === "vocab-n5"
      ? "write-from-meaning"
      : "write-from-reading";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StepDots step={step} />

      {step === "meet" && (
        <div className="flex flex-1 flex-col gap-5">
          {kanji ? (
            <KanjiMeet kanji={kanji} vocab={vocab} />
          ) : (
            <MeetCard item={item} autoplayAudio={autoplayAudio} />
          )}
          <div className="mt-auto">
            <PrimaryButton onClick={() => setStep("watch")}>
              {strings.newItem.toWatch}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === "watch" && strokes && (
        <WatchStep strokes={strokes} onNext={() => setStep("trace")} />
      )}

      {step === "trace" && (
        <>
          <p className="text-center text-sm text-muted">
            {strings.lesson.traceHint}
          </p>
          <WordWriter
            chars={item.chars}
            mode="trace"
            strictness={strictness}
            onComplete={() => setStep("recall")}
          />
        </>
      )}

      {step === "recall" && (
        <>
          <p className="text-center font-medium">
            {strings.newItem.recallPrompt}
          </p>
          <Prompt {...writePrompt(item, recallType)} />
          <WordWriter
            chars={item.chars}
            mode="recall"
            strictness={strictness}
            onComplete={(tally) => {
              const g = gradeCharacter(tally);
              setGrade(g);
              setStep("result");
              onLearned(g);
            }}
          />
        </>
      )}

      {step === "result" && grade && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="font-hand text-8xl break-all">{item.chars.join("")}</p>
          <div>
            <p className="text-2xl font-semibold">
              {strings.lesson.grades[grade]}
            </p>
            <p className="mt-1 text-muted">
              {item.romaji ?? `${item.reading} · ${item.meaning}`}
            </p>
          </div>
          <div className="w-full max-w-sm">
            <PrimaryButton onClick={onNext}>
              {strings.review.continue}
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}

/** Meet step for kana and words: big characters, reading, meaning, audio. */
function MeetCard({
  item,
  autoplayAudio,
}: {
  item: StudyItem;
  autoplayAudio: boolean;
}) {
  useEffect(() => {
    if (autoplayAudio) speak(item.reading);
  }, [item.reading, autoplayAudio]);

  const isKana = item.romaji !== undefined;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted">
        {isKana ? strings.newItem.meetKana : strings.newItem.meetWord}
      </p>
      <p className="font-hand text-9xl leading-none break-all">
        {item.chars.join("")}
      </p>
      {isKana ? (
        <p className="text-3xl font-semibold">{item.romaji}</p>
      ) : (
        <div>
          <p className="font-hand text-3xl">{item.reading}</p>
          <p className="mt-1 text-lg">{item.meaning}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => speak(item.reading)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 font-medium active:opacity-70"
      >
        <SpeakerIcon />
        {strings.newItem.listen}
      </button>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const current = step === "result" ? STEPS.length : STEPS.indexOf(step);
  return (
    <ol className="grid grid-cols-4 gap-2 text-center text-xs">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={`rounded-full py-1 ${
            i === current
              ? "bg-accent font-semibold text-white"
              : i < current
                ? "text-accent"
                : "text-muted"
          }`}
        >
          {strings.newItem.steps[s]}
        </li>
      ))}
    </ol>
  );
}
