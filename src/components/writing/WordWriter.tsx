"use client";

import { useRef, useState } from "react";
import { KanjiWriter } from "@/components/writing/KanjiWriter";
import { useStrokes } from "@/components/writing/useStrokes";
import type { CharacterTally, Strictness } from "@/lib/strokes/compare";
import { strings } from "@/lib/strings";

const EMPTY: CharacterTally = {
  sloppy: 0,
  misses: 0,
  hints: 0,
  showedAnswer: false,
};

export function addTallies(a: CharacterTally, b: CharacterTally): CharacterTally {
  return {
    sloppy: a.sloppy + b.sloppy,
    misses: a.misses + b.misses,
    hints: a.hints + b.hints,
    showedAnswer: a.showedAnswer || b.showedAnswer,
  };
}

/**
 * Writes a word one character at a time on the same canvas. A row of boxes
 * above it shows the characters done so far (one box per character).
 */
export function WordWriter({
  chars,
  mode,
  strictness,
  onComplete,
}: {
  chars: string[];
  mode: "trace" | "recall";
  strictness?: Strictness;
  /** Called once with the tally summed over every character. */
  onComplete: (tally: CharacterTally) => void;
}) {
  const strokes = useStrokes(chars);
  const [index, setIndex] = useState(0);
  const total = useRef(EMPTY);

  if (!strokes) return <div className="flex-1" />;

  const onCharDone = (tally: CharacterTally) => {
    total.current = addTallies(total.current, tally);
    if (index + 1 < chars.length) setIndex(index + 1);
    else onComplete(total.current);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {chars.length > 1 && (
        <ol
          className="flex justify-center gap-1.5"
          aria-label={strings.review.charOf(index + 1, chars.length)}
        >
          {chars.map((c, i) => (
            <li
              key={i}
              className={`font-hand flex h-10 w-10 items-center justify-center rounded-lg border text-2xl ${
                i === index
                  ? "border-accent text-accent"
                  : "border-border text-foreground"
              }`}
            >
              {i < index || mode === "trace" ? c : ""}
            </li>
          ))}
        </ol>
      )}
      <KanjiWriter
        key={index}
        refs={strokes[index]}
        mode={mode}
        strictness={strictness}
        onComplete={onCharDone}
      />
    </div>
  );
}
