"use client";

import { useEffect, useRef, useState } from "react";
import { strokeToPath } from "@/components/writing/StrokeGuide";
import { WritingCanvas } from "@/components/writing/WritingCanvas";
import { INK_SIZE } from "@/lib/strokes/ink";
import { buzzDone, buzzMiss, tapOk } from "@/lib/native/haptics";
import {
  isAccepted,
  type CharacterTally,
  type Strictness,
  type StrokeVerdict,
} from "@/lib/strokes/compare";
import {
  addHint,
  addStroke,
  isComplete,
  nextIndex,
  showAnswer,
  startSession,
} from "@/lib/strokes/session";
import type { RefStroke, Stroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";

/** How long a rejected stroke's correct path stays on screen. */
const FLASH_MS = 1100;
/** Pause after the last stroke before reporting completion. */
const COMPLETE_DELAY_MS = 500;
const SLOPPY_COLOR = "#d97706";
const GUIDE_WIDTH = INK_SIZE * 100;

interface KanjiWriterProps {
  refs: RefStroke[];
  /** trace: faint model + next stroke highlighted. recall: blank box, hints on request. */
  mode: "trace" | "recall";
  strictness?: Strictness;
  onComplete: (tally: CharacterTally) => void;
}

/** Writes one character stroke by stroke with live grading and feedback. */
export function KanjiWriter({
  refs,
  mode,
  strictness = "normal",
  onComplete,
}: KanjiWriterProps) {
  const [session, setSession] = useState(() => startSession(refs, strictness));
  const [flash, setFlash] = useState<{
    index: number;
    verdict: StrokeVerdict;
  } | null>(null);
  const [hintFor, setHintFor] = useState<number | null>(null);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const done = isComplete(session);
  const next = nextIndex(session);
  const showModel = mode === "trace" || session.tally.showedAnswer;

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(
      () => onCompleteRef.current(session.tally),
      COMPLETE_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [done, session.tally]);

  const onStroke = (stroke: Stroke) => {
    if (done) return;
    const updated = addStroke(session, stroke);
    const verdict = updated.last!.verdict;
    setSession(updated);
    if (isAccepted(verdict)) {
      setFlash(null);
      if (isComplete(updated)) buzzDone();
      else tapOk();
    } else {
      setFlash({ index: next, verdict });
      buzzMiss();
    }
  };

  const restart = () => {
    setSession(startSession(refs, strictness));
    setFlash(null);
    setHintFor(null);
  };

  const hintIndex = hintFor === next ? next : null;
  const highlighted =
    !done && (mode === "trace" || hintIndex !== null) ? next : null;
  const feedback =
    flash?.verdict ??
    (session.last && isAccepted(session.last.verdict)
      ? session.last.verdict
      : null);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1">
        <WritingCanvas
          strokes={session.accepted.map((a) => a.stroke)}
          strokeColors={session.accepted.map((a) =>
            a.result.verdict === "sloppy" ? SLOPPY_COLOR : undefined,
          )}
          onStroke={onStroke}
          disabled={done}
          className="absolute inset-0"
          underlay={
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
              {showModel &&
                refs.map((ref, i) => (
                  <path
                    key={i}
                    d={strokeToPath(ref)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={GUIDE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted"
                    opacity={0.18}
                  />
                ))}
              {highlighted !== null && (
                <NextStroke
                  stroke={refs[highlighted]}
                  number={highlighted + 1}
                />
              )}
              {flash && (
                <path
                  d={strokeToPath(refs[flash.index])}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={GUIDE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.7}
                />
              )}
            </svg>
          }
        />
      </div>

      <p
        className={`h-5 text-center text-sm ${
          flash ? "text-red-600 dark:text-red-400" : "text-muted"
        }`}
        aria-live="polite"
      >
        {feedback && strings.lesson.feedback[feedback]}
      </p>

      <div className="flex gap-3">
        {mode === "recall" && (
          <>
            <ControlButton
              onClick={() => {
                setSession(addHint(session));
                setHintFor(next);
              }}
              disabled={
                done || hintIndex !== null || session.tally.showedAnswer
              }
            >
              {strings.lesson.hint}
            </ControlButton>
            <ControlButton
              onClick={() => setSession(showAnswer(session))}
              disabled={done || session.tally.showedAnswer}
            >
              {strings.lesson.showAnswer}
            </ControlButton>
          </>
        )}
        <ControlButton
          onClick={restart}
          disabled={
            session.accepted.length === 0 && !session.tally.showedAnswer
          }
        >
          {strings.lesson.restart}
        </ControlButton>
      </div>
    </div>
  );
}

/** The stroke to draw next: accent path, a dot where it starts, its number. */
function NextStroke({
  stroke,
  number,
}: {
  stroke: [number, number][];
  number: number;
}) {
  const [x, y] = stroke[0];
  return (
    <g className="text-accent">
      <path
        d={strokeToPath(stroke)}
        fill="none"
        stroke="currentColor"
        strokeWidth={GUIDE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.45}
      />
      <circle
        cx={x * 100}
        cy={y * 100}
        r={GUIDE_WIDTH * 0.75}
        fill="currentColor"
      />
      <text
        x={Math.max(1, x * 100 - 7)}
        y={Math.max(6, y * 100 - 4)}
        fontSize={6}
        fill="currentColor"
        fontWeight={600}
      >
        {number}
      </text>
    </g>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
