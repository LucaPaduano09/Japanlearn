import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { StudyItem } from "@/lib/srs/decks";
import {
  activityTimes,
  addMissingCards,
  allCards,
  allItems,
  countDue,
  getSetting,
  introduceItem,
  introducedToday,
  nextDue,
  reviewCard,
  setSetting,
} from "./repo";
import { getDb } from "./schema";

const NOW = new Date(2026, 10, 4, 9, 0).getTime();
const MIN = 60_000;
const TYPES = ["write-from-reading", "recognize"] as const;

beforeEach(async () => {
  const db = getDb();
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe("introduceItem", () => {
  it("creates one card per type, due on the first learning step", async () => {
    await introduceItem("hiragana", "あ", [...TYPES], "good", NOW);
    const cards = await allCards();
    expect(cards.map((c) => c.id).sort()).toEqual([
      "hiragana|あ|recognize",
      "hiragana|あ|write-from-reading",
    ]);
    for (const c of cards) expect(c.due).toBe(NOW + 10 * MIN);
    expect(await allItems()).toMatchObject([
      { id: "hiragana|あ", grade: "good", introducedAt: NOW },
    ]);
    expect(await introducedToday(NOW)).toBe(1);
  });

  it("keeps a perfect first write on the learning steps", async () => {
    await introduceItem("hiragana", "あ", [...TYPES], "easy", NOW);
    for (const c of await allCards()) expect(c.due).toBe(NOW + 10 * MIN);
    expect((await allItems())[0].grade).toBe("easy");
  });

  it("only updates the grade when the item already exists", async () => {
    await introduceItem("hiragana", "あ", [...TYPES], "good", NOW);
    await introduceItem("hiragana", "あ", [...TYPES], "again", NOW + MIN);
    const cards = await allCards();
    expect(cards).toHaveLength(2);
    for (const c of cards) expect(c.due).toBe(NOW + 10 * MIN);
    expect((await allItems())[0].grade).toBe("again");
  });
});

describe("reviewCard", () => {
  it("moves the due date and logs the review", async () => {
    await introduceItem("hiragana", "あ", [...TYPES], "good", NOW);
    expect(await countDue(NOW)).toBe(0);
    const later = NOW + 10 * MIN;
    expect(await countDue(later)).toBe(2);

    const [card] = await allCards();
    const updated = await reviewCard(card, "good", { durationMs: 3000, mistakes: 0 }, later);
    expect(updated.due).toBeGreaterThan(later + 12 * 60 * MIN);
    expect((await allCards()).find((c) => c.id === card.id)!.due).toBe(updated.due);
    expect(await countDue(later)).toBe(1);
    expect(await nextDue()).toBe(later);
    expect((await activityTimes()).sort()).toEqual([NOW, later]);
  });
});

describe("addMissingCards", () => {
  const word: StudyItem = { deckId: "vocab-n5", id: "ねこ", chars: ["ね", "こ"], reading: "ねこ" };
  const library = { items: new Map([["vocab-n5|ねこ", word]]) };

  it("adds the card types an item learned earlier doesn't have yet, due now", async () => {
    await introduceItem("vocab-n5", "ねこ", ["recognize"], "good", NOW);
    const later = NOW + 60 * MIN;
    expect(await addMissingCards(library, later)).toBe(3);
    const cards = await allCards();
    expect(cards.map((c) => c.type).sort()).toEqual([
      "recognize",
      "speak",
      "write-from-audio",
      "write-from-meaning",
    ]);
    const speak = cards.find((c) => c.type === "speak")!;
    expect(speak).toMatchObject({ due: later, reps: 0 });
    // The existing card keeps its schedule, and a second run adds nothing.
    expect(cards.find((c) => c.type === "recognize")!.due).toBe(NOW + 10 * MIN);
    expect(await addMissingCards(library, later)).toBe(0);
  });

  it("skips items the content no longer has", async () => {
    await introduceItem("vocab-n5", "いぬ", ["recognize"], "good", NOW);
    expect(await addMissingCards(library, NOW)).toBe(0);
  });
});

describe("skipped card types", () => {
  it("aren't counted as due nor as next due", async () => {
    await introduceItem("vocab-n5", "ねこ", ["speak"], "good", NOW);
    await introduceItem("vocab-n5", "いぬ", ["recognize"], "good", NOW + MIN);
    const later = NOW + 60 * MIN;
    expect(await countDue(later)).toBe(2);
    expect(await countDue(later, ["speak"])).toBe(1);
    expect(await nextDue()).toBe(NOW + 10 * MIN);
    expect(await nextDue(["speak"])).toBe(NOW + 11 * MIN);
  });
});

describe("settings", () => {
  it("returns the fallback until a value is stored", async () => {
    expect(await getSetting("strictness", "normal")).toBe("normal");
    await setSetting("strictness", "strict");
    expect(await getSetting("strictness", "normal")).toBe("strict");
  });
});
