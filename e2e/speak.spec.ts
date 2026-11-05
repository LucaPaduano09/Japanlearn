import { expect, test, type Page } from "@playwright/test";
import { fakeRecognizer, hear, recordSpeech } from "./helpers";

const T0 = new Date("2026-11-04T09:00:00");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** 猫, learned two days ago: only its speaking card is due. */
async function seedCat(page: Page) {
  await page.goto("/settings/");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await page.evaluate(
    ({ now, hour, day }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("kakitai");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(["items", "cards"], "readwrite");
          tx.objectStore("items").put({
            id: "vocab-n5|猫",
            deckId: "vocab-n5",
            itemId: "猫",
            introducedAt: now - 2 * day,
            grade: "good",
          });
          for (const type of ["write-from-meaning", "write-from-reading", "recognize", "speak"]) {
            tx.objectStore("cards").put({
              id: `vocab-n5|猫|${type}`,
              deckId: "vocab-n5",
              itemId: "猫",
              type,
              due: type === "speak" ? now - hour : now + 10 * day,
              state: 2,
              stability: 2,
              stabilityFast: 2,
              difficulty: 5,
              scheduleStatus: "review",
              lastReview: now - 2 * day,
              reps: 2,
              lapses: 0,
              scheduledDays: 2,
              learningStep: 0,
            });
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { now: T0.getTime(), hour: HOUR, day: DAY },
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(T0);
  await recordSpeech(page);
  await fakeRecognizer(page);
  await seedCat(page);
});

test("read a word aloud: a miss, then the word spelled with kanji", async ({ page }) => {
  await page.goto("/review/");
  await expect(page.getByText("Read it aloud")).toBeVisible();
  await expect(page.getByText("猫", { exact: true })).toBeVisible();

  await hear(page, "根っこ", "寝込");
  await page.getByRole("button", { name: "Speak", exact: true }).click();
  await expect(page.getByText("I heard “根っこ”.")).toBeVisible();
  await expect(page.getByText("2 tries left")).toBeVisible();

  await hear(page, "猫。");
  await page.getByRole("button", { name: "Speak", exact: true }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  // The right answer is spoken back.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken))
    .toContain("ねこ");

  // One miss: known, with some help.
  await expect(page.getByText("Got it, with some help")).toBeVisible();
  await expect(page.getByText(/Next review: in \d+ days?/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
});

test("a recognizer that never stops on its own still gives up", async ({ page }) => {
  await page.goto("/review/");
  await page.evaluate(() => ((window as unknown as { recognizerStuck: boolean }).recognizerStuck = true));
  await page.getByRole("button", { name: "Speak", exact: true }).click();
  await expect(page.getByText("Listening…")).toBeVisible();
  // About 5 s without words, then it stops and says so.
  await expect(page.getByText("I didn't hear anything.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Speak", exact: true })).toBeEnabled();
});

test("three misses count as wrong", async ({ page }) => {
  await page.goto("/review/");
  await hear(page, "犬");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Speak", exact: true }).click();
    if (i < 2) await expect(page.getByText(`${2 - i} ${i === 1 ? "try" : "tries"} left`)).toBeVisible();
  }
  await expect(page.getByText("Keep practicing this one")).toBeVisible();
});

test("can't speak now: the card waits, and turning speaking off hides it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("1 to review")).toBeVisible();
  await page.getByRole("link", { name: /1 to review/ }).click();
  await page.getByRole("button", { name: "Can't speak now" }).click();
  await expect(page.getByRole("heading", { name: "All caught up" })).toBeVisible();

  // Still due next time…
  await page.goto("/");
  await expect(page.getByText("1 to review")).toBeVisible();
  // …unless speaking practice is off.
  await page.goto("/settings/");
  const toggle = page.getByRole("switch", { name: /Speaking practice/ });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.getByRole("link", { name: "道 Path" }).click();
  await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible();
  await expect(page.getByText(/to review/)).toHaveCount(0);
});
