import {
  gradeStroke,
  isAccepted,
  type Strictness,
  type StrokeResult,
  type CharacterTally,
} from "./compare";
import type { RefStroke, Stroke } from "./types";

/** Writing one character stroke by stroke; misses are rejected, not kept. */
export interface WritingSession {
  refs: RefStroke[];
  strictness: Strictness;
  accepted: { stroke: Stroke; result: StrokeResult }[];
  /** Outcome of the most recent stroke (accepted or not). */
  last: StrokeResult | null;
  tally: CharacterTally;
}

export function startSession(
  refs: RefStroke[],
  strictness: Strictness = "normal",
): WritingSession {
  return {
    refs,
    strictness,
    accepted: [],
    last: null,
    tally: { sloppy: 0, misses: 0, hints: 0, showedAnswer: false },
  };
}

export function isComplete(s: WritingSession) {
  return s.accepted.length >= s.refs.length;
}

/** Index of the reference stroke the user should draw next. */
export function nextIndex(s: WritingSession) {
  return s.accepted.length;
}

export function addStroke(s: WritingSession, stroke: Stroke): WritingSession {
  if (isComplete(s)) return s;
  const result = gradeStroke(stroke, s.refs, nextIndex(s), s.strictness);
  const tally = { ...s.tally };
  if (!isAccepted(result.verdict)) tally.misses++;
  else if (result.verdict === "sloppy") tally.sloppy++;
  return {
    ...s,
    accepted: isAccepted(result.verdict)
      ? [...s.accepted, { stroke, result }]
      : s.accepted,
    last: result,
    tally,
  };
}

export function addHint(s: WritingSession): WritingSession {
  return { ...s, tally: { ...s.tally, hints: s.tally.hints + 1 } };
}

export function showAnswer(s: WritingSession): WritingSession {
  return { ...s, tally: { ...s.tally, showedAnswer: true } };
}
