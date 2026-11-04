"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KanjiMeet } from "@/components/learn/KanjiMeet";
import { KanjiWriter } from "@/components/writing/KanjiWriter";
import { StrokeGuide } from "@/components/writing/StrokeGuide";
import { findLesson, LESSONS, type Lesson } from "@/lib/content/lessons";
import { loadKanjiN5, loadStrokes, loadVocabN5 } from "@/lib/content/loader";
import { teachableMeanings } from "@/lib/content/readings";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import {
  gradeCharacter,
  type CharacterGrade,
  type CharacterTally,
} from "@/lib/strokes/compare";
import type { RefStroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";
import { useProgress } from "@/store/progress";

const STEPS = ["meet", "watch", "trace", "recall"] as const;
type Step = (typeof STEPS)[number] | "result";

interface Content {
  kanji: Map<string, KanjiEntry>;
  vocab: VocabEntry[];
}

/** One lesson: each kanji goes meaning → stroke order → trace → from memory. */
export function LessonFlow() {
  const params = useSearchParams();
  const lesson = findLesson(params.get("id"));
  const startChar = params.get("k");
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    useProgress.persist.rehydrate();
    Promise.all([loadKanjiN5(), loadVocabN5()]).then(([kanji, vocab]) =>
      setContent({ kanji: new Map(kanji.map((k) => [k.char, k])), vocab }),
    );
  }, []);

  if (!lesson) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <p className="text-muted">{strings.lesson.notFound}</p>
        <Link href="/learn/" className="mt-4 inline-block text-accent">
          {strings.lesson.back}
        </Link>
      </div>
    );
  }
  if (!content) return null;
  return (
    <LessonRunner
      key={`${lesson.id}-${startChar}`}
      lesson={lesson}
      content={content}
      startChar={startChar}
    />
  );
}

function LessonRunner({
  lesson,
  content,
  startChar,
}: {
  lesson: Lesson;
  content: Content;
  /** Kanji to open on (?k=); otherwise resume at the first one not learned. */
  startChar: string | null;
}) {
  const learned = useProgress((s) => s.learned);
  const markLearned = useProgress((s) => s.markLearned);
  const [index, setIndex] = useState(() => {
    const requested = startChar ? lesson.kanji.indexOf(startChar) : -1;
    if (requested >= 0) return requested;
    return Math.max(
      0,
      lesson.kanji.findIndex((c) => !learned[c]),
    );
  });
  const [picking, setPicking] = useState(false);
  const [step, setStep] = useState<Step>("meet");
  const [grade, setGrade] = useState<CharacterGrade | null>(null);
  const [attempt, setAttempt] = useState(0); // remounts the writer on retry
  const [refs, setRefs] = useState<{
    char: string;
    strokes: RefStroke[];
  } | null>(null);
  const [finished, setFinished] = useState(false);

  const char = lesson.kanji[index];
  const kanji = content.kanji.get(char)!;

  useEffect(() => {
    let cancelled = false;
    loadStrokes(char).then((data) => {
      if (!cancelled && data) setRefs({ char, strokes: data.strokes });
    });
    return () => {
      cancelled = true;
    };
  }, [char]);

  const onRecallDone = useCallback(
    (tally: CharacterTally) => {
      const g = gradeCharacter(tally);
      markLearned(char, g);
      setGrade(g);
      setStep("result");
    },
    [char, markLearned],
  );

  /** Opens any kanji of the lesson from its first step (also to redo it). */
  const jumpTo = (i: number) => {
    setIndex(i);
    setStep("meet");
    setGrade(null);
    setFinished(false);
    setPicking(false);
  };

  const goNext = () => {
    if (index + 1 >= lesson.kanji.length) setFinished(true);
    else jumpTo(index + 1);
  };

  if (finished)
    return <LessonComplete lesson={lesson} onRestart={() => jumpTo(0)} />;

  const strokes = refs?.char === char ? refs.strokes : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-3">
        <Link
          href="/learn/"
          aria-label={strings.lesson.close}
          className="-ml-2 px-2 text-2xl leading-none text-muted"
        >
          ×
        </Link>
        <div className="flex-1">
          <p className="text-sm font-medium">{strings.lessons[lesson.title]}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${(index / lesson.kanji.length) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPicking((p) => !p)}
          aria-expanded={picking}
          aria-label={strings.lesson.pick}
          className="rounded-full border border-border px-3 py-1 text-sm text-muted active:opacity-70"
        >
          {strings.lesson.position(index + 1, lesson.kanji.length)} ▾
        </button>
      </header>

      {picking && (
        <ul className="grid grid-cols-7 gap-2 rounded-2xl border border-border bg-surface p-3">
          {lesson.kanji.map((c, i) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => jumpTo(i)}
                aria-current={i === index ? "true" : undefined}
                className={`font-hand aspect-square w-full rounded-xl text-2xl active:opacity-70 ${
                  i === index
                    ? "bg-accent text-white"
                    : learned[c]
                      ? "text-accent"
                      : "text-muted"
                }`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}

      <StepTabs step={step} />

      {step === "meet" && (
        <div className="flex flex-1 flex-col gap-5">
          <KanjiMeet kanji={kanji} vocab={content.vocab} />
          <div className="mt-auto">
            <PrimaryButton onClick={() => setStep("watch")}>
              {strings.lesson.toWatch}
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === "watch" && strokes && (
        <WatchStep strokes={strokes} onNext={() => setStep("trace")} />
      )}

      {step === "trace" && strokes && (
        <>
          <p className="text-center text-sm text-muted">
            {strings.lesson.traceHint}
          </p>
          <KanjiWriter
            key={`trace-${char}-${attempt}`}
            refs={strokes}
            mode="trace"
            onComplete={() => setStep("recall")}
          />
        </>
      )}

      {step === "recall" && strokes && (
        <>
          <div className="text-center">
            <p className="font-medium">{strings.lesson.recallPrompt}</p>
            <p className="text-sm text-muted">
              {teachableMeanings(kanji).slice(0, 3).join(", ")}
            </p>
          </div>
          <KanjiWriter
            key={`recall-${char}-${attempt}`}
            refs={strokes}
            mode="recall"
            onComplete={onRecallDone}
          />
        </>
      )}

      {step === "result" && grade && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="font-hand text-9xl">{char}</p>
          <div>
            <p className="text-2xl font-semibold">
              {strings.lesson.grades[grade]}
            </p>
            <p className="mt-1 text-muted">
              {teachableMeanings(kanji).slice(0, 3).join(", ")}
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <PrimaryButton onClick={goNext}>
              {index + 1 >= lesson.kanji.length
                ? strings.lesson.finish
                : strings.lesson.next}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => {
                setAttempt((a) => a + 1);
                setStep("recall");
              }}
              className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70"
            >
              {strings.lesson.practiceAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepTabs({ step }: { step: Step }) {
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
          {strings.lesson.steps[s]}
        </li>
      ))}
    </ol>
  );
}

function WatchStep({
  strokes,
  onNext,
}: {
  strokes: RefStroke[];
  onNext: () => void;
}) {
  const [replay, setReplay] = useState(0);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-center text-sm text-muted">
        {strings.lesson.watchHint}
      </p>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <StrokeGuide
            key={replay}
            strokes={strokes}
            strokeMs={700}
            gapMs={250}
            className="aspect-square max-h-full w-full max-w-full rounded-2xl border border-border bg-surface text-accent"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setReplay((r) => r + 1)}
          className="flex-1 rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70"
        >
          {strings.lesson.replay}
        </button>
        <div className="flex-[2]">
          <PrimaryButton onClick={onNext}>
            {strings.lesson.toTrace}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function LessonComplete({
  lesson,
  onRestart,
}: {
  lesson: Lesson;
  onRestart: () => void;
}) {
  const next = LESSONS[LESSONS.indexOf(lesson) + 1];
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <p className="font-hand text-5xl tracking-widest">
        {lesson.kanji.join("")}
      </p>
      <div>
        <h1 className="text-2xl font-semibold">{strings.lesson.lessonDone}</h1>
        <p className="mt-1 text-muted">
          {strings.lesson.lessonDoneBody(lesson.kanji.length)}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {next && (
          <Link
            href={`/learn/lesson/?id=${next.id}`}
            className="rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
          >
            {strings.lesson.nextLesson}: {strings.lessons[next.title]}
          </Link>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70"
        >
          {strings.lesson.redoLesson}
        </button>
        <Link
          href="/learn/"
          className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70"
        >
          {strings.lesson.back}
        </Link>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-80"
    >
      {children}
    </button>
  );
}
