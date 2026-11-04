import { pathLength, resample, toPairs } from "./resample";
import type { RefStroke, Stroke } from "./types";

// --- Tunable constants (all distances are in 0..1 box units) ---------------

/** Points both strokes are resampled to before comparing. */
export const RESAMPLE_POINTS = 32;
/** Mean point distance up to which a stroke counts as clean. */
export const OK_DISTANCE = 0.075;
/** Mean point distance up to which a stroke is accepted but sloppy. */
export const SLOPPY_DISTANCE = 0.14;
/** Multiplies both limits per strictness setting. */
export const STRICTNESS_SCALE = {
  relaxed: 1.35,
  normal: 1,
  strict: 0.75,
} as const;
/** A stroke is "reversed" when the backwards match beats the forward one by this factor. */
export const REVERSED_RATIO = 0.6;
/** Reference strokes shorter than this (dots) skip the direction check. */
export const MIN_DIRECTION_LENGTH = 0.06;
/** Misses + hints up to this count still grade the character as Hard (more = Again). */
export const HARD_MAX_MISTAKES = 2;

export type Strictness = keyof typeof STRICTNESS_SCALE;
export type StrokeVerdict =
  "ok" | "sloppy" | "wrong-direction" | "wrong-order" | "miss";

export interface StrokeResult {
  verdict: StrokeVerdict;
  /** Mean distance to the expected reference stroke. */
  distance: number;
  /** For wrong-order: the later reference stroke the user actually drew. */
  matchedIndex?: number;
}

/** Mean point-to-point distance after resampling both strokes. */
export function strokeDistance(
  a: [number, number][],
  b: [number, number][],
): number {
  const ra = resample(a, RESAMPLE_POINTS);
  const rb = resample(b, RESAMPLE_POINTS);
  let sum = 0;
  for (let i = 0; i < RESAMPLE_POINTS; i++) {
    sum += Math.hypot(ra[i][0] - rb[i][0], ra[i][1] - rb[i][1]);
  }
  return sum / RESAMPLE_POINTS;
}

/**
 * Grades the user's stroke against reference stroke `index`. Position counts
 * (no per-stroke normalization), so the stroke has to be where it belongs.
 */
export function gradeStroke(
  stroke: Stroke,
  refs: RefStroke[],
  index: number,
  strictness: Strictness = "normal",
): StrokeResult {
  const user = toPairs(stroke);
  const ref = refs[index];
  const scale = STRICTNESS_SCALE[strictness];
  const okLimit = OK_DISTANCE * scale;
  const sloppyLimit = SLOPPY_DISTANCE * scale;

  const distance = strokeDistance(user, ref);
  if (pathLength(ref) >= MIN_DIRECTION_LENGTH) {
    const reversed = strokeDistance(user, [...ref].reverse());
    if (reversed <= sloppyLimit && reversed < distance * REVERSED_RATIO) {
      return { verdict: "wrong-direction", distance };
    }
  }
  if (distance <= okLimit) return { verdict: "ok", distance };
  if (distance <= sloppyLimit) return { verdict: "sloppy", distance };

  for (let j = index + 1; j < refs.length; j++) {
    if (strokeDistance(user, refs[j]) <= sloppyLimit) {
      return { verdict: "wrong-order", distance, matchedIndex: j };
    }
  }
  return { verdict: "miss", distance };
}

export function isAccepted(verdict: StrokeVerdict) {
  return verdict === "ok" || verdict === "sloppy";
}

export type CharacterGrade = "easy" | "good" | "hard" | "again";

export interface CharacterTally {
  sloppy: number;
  misses: number;
  hints: number;
  showedAnswer: boolean;
}

/** Maps a finished character to the FSRS rating (BOOTSTRAP §6.3). */
export function gradeCharacter({
  sloppy,
  misses,
  hints,
  showedAnswer,
}: CharacterTally): CharacterGrade {
  const mistakes = misses + hints;
  if (showedAnswer || mistakes > HARD_MAX_MISTAKES) return "again";
  if (mistakes > 0) return "hard";
  if (sloppy > 0) return "good";
  return "easy";
}
