import type { CharacterGrade } from "@/lib/strokes/compare";
import {
  cardId,
  itemKey,
  type CardType,
  type DeckId,
} from "@/lib/srs/decks";
import type { CardRecord } from "@/lib/srs/queue";
import { dayKey } from "@/lib/srs/queue";
import { GRADE_RATING, newSrs, reviewSrs } from "@/lib/srs/scheduler";
import { getDb, type ItemRecord } from "./schema";

/**
 * Creates the item's cards after its intro, each already reviewed once with
 * the from-memory grade, so they come back on the learning steps. An item
 * that already exists only gets its grade updated (redoing a lesson doesn't
 * reset its schedule).
 */
export async function introduceItem(
  deckId: DeckId,
  itemId: string,
  types: CardType[],
  grade: CharacterGrade,
  now = Date.now(),
): Promise<void> {
  const db = getDb();
  const id = itemKey(deckId, itemId);
  // Writing it right after tracing doesn't prove it's known: Easy would skip
  // the learning steps (FSRS sends a new Easy card weeks out), so cap at Good.
  const seed = grade === "easy" ? "good" : grade;
  const cards: CardRecord[] = [];
  for (const type of types) {
    const cid = cardId(deckId, itemId, type);
    const fields = await reviewSrs(cid, await newSrs(cid, now), seed, now);
    cards.push({ id: cid, deckId, itemId, type, ...fields });
  }
  await db.transaction("rw", db.items, db.cards, async () => {
    const existing = await db.items.get(id);
    if (existing) {
      await db.items.update(id, { grade });
      return;
    }
    await db.items.add({ id, deckId, itemId, introducedAt: now, grade });
    await db.cards.bulkPut(cards);
  });
}

/** Applies a review to a card, logs it, and returns the rescheduled card. */
export async function reviewCard(
  card: CardRecord,
  grade: CharacterGrade,
  { durationMs, mistakes }: { durationMs: number; mistakes: number },
  now = Date.now(),
): Promise<CardRecord> {
  const db = getDb();
  const fields = await reviewSrs(card.id, card, grade, now);
  const updated: CardRecord = { ...card, ...fields };
  await db.transaction("rw", db.cards, db.reviews, async () => {
    await db.cards.put(updated);
    await db.reviews.add({
      cardId: card.id,
      ts: now,
      rating: GRADE_RATING[grade],
      durationMs,
      mistakes,
    });
  });
  return updated;
}

export function allCards(): Promise<CardRecord[]> {
  return getDb().cards.toArray();
}

export function allItems(): Promise<ItemRecord[]> {
  return getDb().items.toArray();
}

export function countDue(now = Date.now()): Promise<number> {
  return getDb().cards.where("due").belowOrEqual(now).count();
}

/** Earliest upcoming due date, or null when there are no cards. */
export async function nextDue(): Promise<number | null> {
  const first = await getDb().cards.orderBy("due").first();
  return first?.due ?? null;
}

/** Timestamps of all reviews and intros, for the streak. */
export async function activityTimes(): Promise<number[]> {
  const db = getDb();
  const [reviews, items] = await Promise.all([
    db.reviews.orderBy("ts").keys(),
    db.items.orderBy("introducedAt").keys(),
  ]);
  return [...reviews, ...items].map(Number);
}

export async function introducedToday(now = Date.now()): Promise<number> {
  const items = await allItems();
  return items.filter((i) => dayKey(i.introducedAt) === dayKey(now)).length;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await getDb().settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDb().settings.put({ key, value });
}
