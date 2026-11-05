"use client";

import { useEffect, useState } from "react";
import { Prompt, writePrompt } from "@/components/cards/Prompt";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { KanjiSimpleMeet } from "@/components/cards/KanjiSimpleMeet";
import { MicButton, SpeechStatus, useSpeechCheck } from "@/components/cards/speech";
import { Furigana } from "@/components/ui/Furigana";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { useStrokes } from "@/components/writing/useStrokes";
import { WatchStep } from "@/components/writing/WatchStep";
import { WordWriter } from "@/components/writing/WordWriter";
import { toHiragana, toRomaji } from "@/lib/content/romaji";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import { speak } from "@/lib/native/tts";
import type { ReadingIndex } from "@/lib/speech/match";
import { isKanjiDeck, isVocabDeck, type StudyItem } from "@/lib/srs/decks";
import {
  gradeCharacter,
  type CharacterGrade,
  type Strictness,
} from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

const STEPS = ["meet", "speak", "watch", "trace", "recall"] as const;
type Step = (typeof STEPS)[number] | "result";

/** After this many misses the say-it step suggests listening first. */
const HINT_AFTER = 2;

/**
 * A new item's short intro (BOOTSTRAP §7): meet it, say it aloud (kana and
 * words, where the device can listen), watch the stroke order, trace over
 * the ghost, then write it from memory. The from-memory grade seeds its SRS
 * cards; saying it is practice only.
 */
export function ItemIntro({
  item,
  kanji,
  vocab,
  strictness,
  autoplayAudio,
  speaking,
  readingIndex,
  returnTo,
  onLearned,
  onNext,
}: {
  item: StudyItem;
  /** For kanji items: the KANJIDIC entry shown in the meet step. */
  kanji?: KanjiEntry;
  vocab: VocabEntry[];
  strictness: Strictness;
  autoplayAudio: boolean;
  /** Speaking practice is on and the device can listen. */
  speaking: boolean;
  readingIndex: ReadingIndex;
  /** This screen's URL, for links that leave and come back. */
  returnTo: string;
  onLearned: (grade: CharacterGrade) => void;
  onNext: () => void;
}) {
  const [step, setStep] = useState<Step>("meet");
  const [grade, setGrade] = useState<CharacterGrade | null>(null);
  const strokes = useStrokes(item.chars);
  // A kanji alone has several readings: it's said in its words instead.
  const steps = STEPS.filter((s) => s !== "speak" || (speaking && !kanji));
  const recallType =
    isKanjiDeck(item.deckId) || isVocabDeck(item.deckId)
      ? "write-from-meaning"
      : "write-from-reading";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StepDots steps={steps} step={step} />

      {step === "meet" && (
        <div className="flex flex-1 flex-col gap-5">
          {kanji ? (
            <KanjiSimpleMeet kanji={kanji} vocab={vocab} returnTo={returnTo} />
          ) : (
            <MeetCard item={item} autoplayAudio={autoplayAudio} />
          )}
          <div className="mt-auto">
            <PrimaryButton onClick={() => setStep(steps[1])}>
              {steps[1] === "speak" ? strings.newItem.toSpeak : strings.newItem.toWatch}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === "speak" && (
        <SpeakStep item={item} index={readingIndex} onNext={() => setStep("watch")} />
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
      {isKana ? (
        <>
          <p className="font-hand text-9xl leading-none break-all">{item.chars.join("")}</p>
          <p className="text-3xl font-semibold">{item.romaji}</p>
        </>
      ) : (
        <>
          <Furigana
            expression={item.chars.join("")}
            reading={item.reading}
            className="font-hand text-8xl break-all"
          />
          <div>
            <p className="text-lg text-muted">{toRomaji(toHiragana(item.reading))}</p>
            <p className="mt-1 text-lg">{item.meaning}</p>
          </div>
        </>
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

/** Say it aloud until the recognizer agrees, or skip: nothing is graded. */
function SpeakStep({
  item,
  index,
  onNext,
}: {
  item: StudyItem;
  index: ReadingIndex;
  onNext: () => void;
}) {
  const t = strings.newItem;
  const [misses, setMisses] = useState(0);
  const { phase, toggle, cancel } = useSpeechCheck(item, index, (ok) => {
    if (!ok) setMisses((n) => n + 1);
  });
  const isKana = item.romaji !== undefined;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted">{t.sayIt}</p>
        <p className="font-hand text-8xl leading-none break-all">{item.chars.join("")}</p>
        <p className="text-2xl font-semibold">
          {isKana ? item.romaji : toRomaji(toHiragana(item.reading))}
        </p>
        <button
          type="button"
          onClick={() => speak(item.reading)}
          disabled={phase.kind === "listening"}
          className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 font-medium active:opacity-70 disabled:opacity-40"
        >
          <SpeakerIcon />
          {t.listen}
        </button>
      </div>
      <div className="flex flex-col items-center gap-3">
        <MicButton phase={phase} onClick={toggle} disabled={phase.kind === "right"} />
        <SpeechStatus phase={phase} extra={misses >= HINT_AFTER ? t.sayHint : undefined} />
      </div>
      <div className="mt-auto">
        {phase.kind === "right" ? (
          <PrimaryButton onClick={onNext}>{t.toWatch}</PrimaryButton>
        ) : (
          <SecondaryButton
            onClick={() => {
              cancel();
              onNext();
            }}
            className="w-full"
          >
            {t.skipSpeak}
          </SecondaryButton>
        )}
      </div>
    </div>
  );
}

function StepDots({
  steps,
  step,
}: {
  steps: readonly (typeof STEPS)[number][];
  step: Step;
}) {
  const current = step === "result" ? steps.length : steps.indexOf(step);
  return (
    <ol
      className={`grid gap-2 text-center text-xs ${steps.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}
    >
      {steps.map((s, i) => (
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
