import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMITS,
  dayKey,
  dueIn,
  pickChoices,
  planReviews,
  seededRandom,
  spreadSiblings,
  streak,
  type CardRecord,
} from "./queue";

const NOW = new Date(2026, 10, 4, 12, 0).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function card(itemId: string, due: number, type = "recognize"): CardRecord {
  return {
    id: `hiragana|${itemId}|${type}`,
    deckId: "hiragana",
    itemId,
    type: type as CardRecord["type"],
    due,
    state: 2,
    stability: 1,
    stabilityFast: 1,
    difficulty: 5,
    scheduleStatus: "review",
    lastReview: due - DAY,
    reps: 1,
    lapses: 0,
    scheduledDays: 1,
    learningStep: 0,
  };
}

describe("planReviews", () => {
  it("takes only due cards, oldest first, up to the limit", () => {
    const cards = [
      card("あ", NOW - HOUR),
      card("い", NOW + HOUR),
      card("う", NOW - DAY),
    ];
    expect(planReviews({ cards, limits: DEFAULT_LIMITS, now: NOW }).map((c) => c.itemId)).toEqual(["う", "あ"]);
    expect(planReviews({ cards, limits: { reviews: 1 }, now: NOW }).map((c) => c.itemId)).toEqual(["う"]);
  });
});

describe("spreadSiblings", () => {
  it("keeps cards of the same item apart when possible", () => {
    const cards = [
      card("あ", 1, "recognize"),
      card("あ", 2, "write-from-reading"),
      card("い", 3),
    ];
    expect(spreadSiblings(cards).map((c) => c.itemId)).toEqual(["あ", "い", "あ"]);
  });

  it("keeps everything when only siblings are left", () => {
    const cards = [card("あ", 1, "recognize"), card("あ", 2, "write-from-reading")];
    expect(spreadSiblings(cards)).toHaveLength(2);
  });
});

describe("streak", () => {
  it("counts consecutive days ending today", () => {
    expect(streak([NOW, NOW - DAY, NOW - 2 * DAY, NOW - 4 * DAY], NOW)).toBe(3);
  });

  it("still counts a streak that ended yesterday", () => {
    expect(streak([NOW - DAY, NOW - 2 * DAY], NOW)).toBe(2);
  });

  it("is 0 without recent reviews", () => {
    expect(streak([NOW - 3 * DAY], NOW)).toBe(0);
    expect(streak([], NOW)).toBe(0);
  });
});

describe("dayKey", () => {
  it("uses the local calendar date", () => {
    expect(dayKey(new Date(2026, 0, 2, 23, 59).getTime())).toBe(20260102);
  });
});

describe("pickChoices", () => {
  it("returns the answer and distinct distractors", () => {
    const choices = pickChoices("a", ["a", "i", "i", "u", "e", "o"], 4, seededRandom("x"));
    expect(choices).toHaveLength(4);
    expect(choices).toContain("a");
    expect(new Set(choices).size).toBe(4);
  });

  it("is deterministic for a seed", () => {
    const pool = ["i", "u", "e", "o", "ka"];
    expect(pickChoices("a", pool, 4, seededRandom("s"))).toEqual(
      pickChoices("a", pool, 4, seededRandom("s")),
    );
  });

  it("works with a small pool", () => {
    expect(pickChoices("a", ["i"], 4, seededRandom("s")).sort()).toEqual(["a", "i"]);
  });
});

describe("dueIn", () => {
  it("rounds to one unit", () => {
    expect(dueIn(NOW + 10_000, NOW)).toEqual({ unit: "now" });
    expect(dueIn(NOW + 10 * 60_000, NOW)).toEqual({ unit: "minutes", n: 10 });
    expect(dueIn(NOW + 5 * HOUR, NOW)).toEqual({ unit: "hours", n: 5 });
    expect(dueIn(NOW + 3 * DAY, NOW)).toEqual({ unit: "days", n: 3 });
    expect(dueIn(NOW + 90 * DAY, NOW)).toEqual({ unit: "months", n: 3 });
  });
});
