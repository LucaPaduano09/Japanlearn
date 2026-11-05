import type { CardType, DeckId } from "./decks";
import type { SrsFields } from "./scheduler";

/** A card as stored in Dexie: which item/type it is plus its FSRS state. */
export interface CardRecord extends SrsFields {
  id: string;
  deckId: DeckId;
  itemId: string;
  type: CardType;
}

export interface SessionLimits {
  /** Due cards per session. */
  reviews: number;
}

export const DEFAULT_LIMITS: SessionLimits = { reviews: 20 };

/**
 * The due cards for one review session, oldest first, siblings of one item
 * kept apart. New items come from the path's stages, not from here.
 * `skip`: card types this device can't do (they wait, still due).
 */
export function planReviews({
  cards,
  limits,
  now,
  skip = [],
}: {
  cards: CardRecord[];
  limits: SessionLimits;
  now: number;
  skip?: CardType[];
}): CardRecord[] {
  return spreadSiblings(
    cards
      .filter((c) => c.due <= now && !skip.includes(c.type))
      .sort((a, b) => a.due - b.due)
      .slice(0, limits.reviews),
  );
}

/**
 * Reorders cards so two cards of the same item aren't back to back when that
 * can be avoided (seeing あ→romaji right after romaji→あ gives it away).
 */
export function spreadSiblings(cards: CardRecord[]): CardRecord[] {
  const rest = [...cards];
  const out: CardRecord[] = [];
  while (rest.length > 0) {
    const prev = out.at(-1);
    let i = rest.findIndex(
      (c) => !prev || c.itemId !== prev.itemId || c.deckId !== prev.deckId,
    );
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** Local calendar day, e.g. 20261104, for streaks and daily limits. */
export function dayKey(ms: number): number {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function previousDay(ms: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() - 1);
  return d.getTime();
}

/**
 * Consecutive days with at least one review, ending today. A streak that
 * ended yesterday still counts (today isn't over yet).
 */
export function streak(reviewTimes: number[], now: number): number {
  const days = new Set(reviewTimes.map(dayKey));
  let cursor = now;
  if (!days.has(dayKey(cursor))) cursor = previousDay(cursor);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor = previousDay(cursor);
  }
  return n;
}

/** Small deterministic PRNG (mulberry32), so choices don't reshuffle on rerender. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Multiple choice: the answer plus distinct distractors, shuffled. */
export function pickChoices(
  answer: string,
  pool: string[],
  count: number,
  random: () => number,
): string[] {
  const distractors = [...new Set(pool)].filter((p) => p !== answer);
  shuffle(distractors, random);
  const choices = [answer, ...distractors.slice(0, count - 1)];
  return shuffle(choices, random);
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type DueIn =
  | { unit: "now" }
  | { unit: "minutes" | "hours" | "days" | "months"; n: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How far away a due date is, rounded to one human unit. */
export function dueIn(due: number, now: number): DueIn {
  const ms = due - now;
  if (ms < MINUTE) return { unit: "now" };
  if (ms < HOUR) return { unit: "minutes", n: Math.round(ms / MINUTE) };
  if (ms < DAY) return { unit: "hours", n: Math.round(ms / HOUR) };
  if (ms < 30 * DAY) return { unit: "days", n: Math.round(ms / DAY) };
  return { unit: "months", n: Math.round(ms / (30 * DAY)) };
}
