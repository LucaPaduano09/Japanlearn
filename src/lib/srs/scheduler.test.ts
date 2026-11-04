import { describe, expect, it } from "vitest";
import { newSrs, reviewSrs } from "./scheduler";

const NOW = new Date(2026, 10, 4, 9, 0).getTime();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("scheduler", () => {
  it("creates a new card due now", async () => {
    const card = await newSrs("hiragana|あ|recognize", NOW);
    expect(card).toMatchObject({ due: NOW, state: 0, reps: 0, lastReview: null });
  });

  it("follows the learning steps: Again → 1 min, Good → 10 min", async () => {
    const card = await newSrs("c", NOW);
    expect((await reviewSrs("c", card, "again", NOW)).due - NOW).toBe(MIN);
    expect((await reviewSrs("c", card, "good", NOW)).due - NOW).toBe(10 * MIN);
  });

  it("graduates to days after the learning steps", async () => {
    let card = await newSrs("c", NOW);
    card = await reviewSrs("c", card, "good", NOW);
    card = await reviewSrs("c", card, "good", card.due);
    expect(card.state).toBe(2); // Review
    expect(card.due - card.lastReview!).toBeGreaterThanOrEqual(DAY);
  });

  it("schedules Easy further out than Hard", async () => {
    const card = await newSrs("c", NOW);
    const hard = await reviewSrs("c", card, "hard", NOW);
    const easy = await reviewSrs("c", card, "easy", NOW);
    expect(easy.due).toBeGreaterThan(hard.due);
  });

  it("round-trips through plain JSON (Dexie / backups)", async () => {
    const card = await reviewSrs("c", await newSrs("c", NOW), "good", NOW);
    const stored = JSON.parse(JSON.stringify(card));
    const next = await reviewSrs("c", stored, "good", card.due);
    expect(next.reps).toBe(2);
  });

  it("treats a clock before the last review as the last review", async () => {
    const card = await reviewSrs("c", await newSrs("c", NOW), "good", NOW);
    await expect(reviewSrs("c", card, "good", NOW - DAY)).resolves.toBeTruthy();
  });
});
