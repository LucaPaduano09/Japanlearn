"use client";

import Link from "next/link";
import { useState } from "react";
import { PrimaryButton } from "@/components/ui/Button";
import { KanjiWriter } from "@/components/writing/KanjiWriter";
import { useStrokes } from "@/components/writing/useStrokes";
import { gradeCharacter, type CharacterGrade } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

type Mode = "trace" | "recall";

/** Free practice of one character (/write/?c=あ): trace or from memory, graded. */
export function CharPractice({ char }: { char: string }) {
  const chars = [...char].slice(0, 1);
  const strokes = useStrokes(chars);
  const [mode, setMode] = useState<Mode>("trace");
  const [attempt, setAttempt] = useState(0);
  const [grade, setGrade] = useState<CharacterGrade | null>(null);
  const t = strings.write;

  const restart = (m: Mode) => {
    setMode(m);
    setGrade(null);
    setAttempt((a) => a + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-baseline gap-3">
          <span className="font-hand text-4xl">{chars[0]}</span>
          <span className="text-2xl font-semibold">{t.title}</span>
        </h1>
        <Link href={`/kanji/?c=${encodeURIComponent(chars[0])}`} className="text-sm text-accent">
          {t.details}
        </Link>
      </header>

      <div role="radiogroup" aria-label={t.mode} className="flex rounded-xl bg-surface p-1">
        {(["trace", "recall"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => restart(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              mode === m ? "bg-accent text-white" : "text-muted active:opacity-70"
            }`}
          >
            {t.modes[m]}
          </button>
        ))}
      </div>

      {strokes === undefined ? null : strokes === null ? (
        <p className="text-muted">{strings.kanji.notFound(chars[0])}</p>
      ) : grade ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <p className="font-hand text-9xl">{chars[0]}</p>
          <p className="text-2xl font-semibold">{strings.lesson.grades[grade]}</p>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <PrimaryButton onClick={() => restart("recall")}>
              {strings.lesson.practiceAgain}
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <KanjiWriter
          key={`${mode}-${attempt}`}
          refs={strokes[0]}
          mode={mode}
          onComplete={(tally) =>
            mode === "trace" ? restart("recall") : setGrade(gradeCharacter(tally))
          }
        />
      )}
    </div>
  );
}
