import Dexie, { type EntityTable } from "dexie";
import type { CharacterGrade } from "@/lib/strokes/compare";
import type { DeckId } from "@/lib/srs/decks";
import type { CardRecord } from "@/lib/srs/queue";

/** One finished review, kept for streaks, stats and backups. */
export interface ReviewRecord {
  id?: number;
  cardId: string;
  /** When it was answered (ms). */
  ts: number;
  /** FSRS rating 1 Again … 4 Easy. */
  rating: number;
  durationMs: number;
  /** Rejected strokes + hints (0 for recognize cards). */
  mistakes: number;
}

/** An item the learner has been introduced to (its cards exist). */
export interface ItemRecord {
  /** itemKey(): "deckId|itemId". */
  id: string;
  deckId: DeckId;
  itemId: string;
  introducedAt: number;
  /** Grade of the latest from-memory write in an intro or lesson. */
  grade: CharacterGrade;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export type KakitaiDb = Dexie & {
  cards: EntityTable<CardRecord, "id">;
  reviews: EntityTable<ReviewRecord, "id">;
  items: EntityTable<ItemRecord, "id">;
  settings: EntityTable<SettingRecord, "key">;
};

export const DB_NAME = "kakitai";

let db: KakitaiDb | null = null;

/** Opened lazily: IndexedDB only exists in the browser, not in the static prerender. */
export function getDb(): KakitaiDb {
  if (!db) {
    db = new Dexie(DB_NAME) as KakitaiDb;
    db.version(1).stores({
      // FSRS card fields are stored inline; only these are indexed.
      cards: "&id, deckId, itemId, type, due, state",
      reviews: "++id, cardId, ts, rating",
      items: "&id, deckId, introducedAt",
      settings: "&key",
    });
  }
  return db;
}
