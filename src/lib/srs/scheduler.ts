import { DefaultScheduler, Rating } from "ts-fsrs";
import type { CharacterGrade } from "@/lib/strokes/compare";

/**
 * ts-fsrs wrapper. Cards are stored with plain numbers (ms since epoch) so
 * they fit IndexedDB indexes and JSON backups; ts-fsrs works with Dates.
 */

/** Classic learning steps: a fresh card comes back after 1 or 10 minutes. */
export const LEARNING_STEPS = ["1m", "10m"] as const;
export const RELEARNING_STEPS = ["10m"] as const;
export const DESIRED_RETENTION = 0.9;

type Scheduler = Awaited<ReturnType<typeof createScheduler>>;
type FsrsCard = ReturnType<Scheduler["newCard"]>;

function createScheduler() {
  return DefaultScheduler({
    desiredRetention: DESIRED_RETENTION,
    enableShortTerm: true,
    learningSteps: [...LEARNING_STEPS],
    relearningSteps: [...RELEARNING_STEPS],
    // Keep the learning steps instead of letting the model skip them.
    allowModelOverride: false,
    enableFuzz: true,
  });
}

let scheduler: Promise<Scheduler> | null = null;

export function getScheduler(): Promise<Scheduler> {
  scheduler ??= createScheduler();
  return scheduler;
}

/** FSRS memory state as stored on a card row. */
export interface SrsFields {
  /** When the card is next due (ms). */
  due: number;
  /** 0 New, 1 Learning, 2 Review, 3 Relearning (ts-fsrs State). */
  state: number;
  stability: number;
  stabilityFast: number;
  difficulty: number;
  scheduleStatus: string;
  lastReview: number | null;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
}

export const GRADE_RATING = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const satisfies Record<CharacterGrade, Rating>;

function toFields(card: FsrsCard): SrsFields {
  return {
    due: card.dueAt.getTime(),
    state: card.state,
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    scheduleStatus: card.scheduleStatus,
    lastReview: card.lastReviewAt?.getTime() ?? null,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  };
}

function toCard(id: string, f: SrsFields): FsrsCard {
  return {
    cardId: id,
    dueAt: new Date(f.due),
    state: f.state,
    stability: f.stability,
    stabilityFast: f.stabilityFast,
    difficulty: f.difficulty,
    scheduleStatus: f.scheduleStatus,
    lastReviewAt: f.lastReview === null ? null : new Date(f.lastReview),
    reps: f.reps,
    lapses: f.lapses,
    scheduledDays: f.scheduledDays,
    learningStep: f.learningStep,
  } as FsrsCard;
}

export async function newSrs(id: string, now: number): Promise<SrsFields> {
  const s = await getScheduler();
  return toFields(s.newCard({ now: new Date(now), cardId: id }));
}

/** Applies one review; `now` before the last review counts as "at" it. */
export async function reviewSrs(
  id: string,
  fields: SrsFields,
  grade: CharacterGrade,
  now: number,
): Promise<SrsFields> {
  const s = await getScheduler();
  const at = Math.max(now, fields.lastReview ?? now);
  const result = s.review({
    card: toCard(id, fields),
    grade: GRADE_RATING[grade],
    now: new Date(at),
  });
  return toFields(result.card);
}
