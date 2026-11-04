import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const KANA = { あ: "a", い: "i", う: "u", え: "e", お: "o" } as const;
type Kana = keyof typeof KANA;
const BY_ROMAJI = Object.fromEntries(
  Object.entries(KANA).map(([k, r]) => [r, k as Kana]),
);

function refs(char: string): [number, number][][] {
  const hex = char.codePointAt(0)!.toString(16).padStart(5, "0");
  return JSON.parse(readFileSync(`public/data/strokes/${hex}.json`, "utf8"))
    .strokes;
}

/** Draws reference strokes (0..1 box coords) onto the writing canvas. */
async function write(page: Page, char: string) {
  const canvas = page.locator("canvas");
  await expect
    .poll(async () => (await canvas.boundingBox())?.width ?? 0)
    .toBeGreaterThan(100);
  const box = (await canvas.boundingBox())!;
  for (const [first, ...rest] of refs(char)) {
    await page.mouse.move(box.x + first[0] * box.width, box.y + first[1] * box.height);
    await page.mouse.down();
    for (const [x, y] of rest) {
      await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
    }
    await page.mouse.up();
  }
}

const T0 = new Date("2026-11-04T09:00:00");

test("learn 5 hiragana, review them, and see due dates move", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(T0);
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push(u.text);
    };
  });

  // Session 1: the default Hiragana deck introduces あいうえお.
  await page.goto("/");
  await expect(page.getByText("5 new")).toBeVisible();
  await page.getByRole("link", { name: "Start" }).click();
  for (const char of Object.keys(KANA)) {
    await expect(page.getByText("A new kana")).toBeVisible();
    await expect(page.getByText(char, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "See how to write it" }).click();
    await page.getByRole("button", { name: "Trace it" }).click();
    await write(page, char);
    await expect(page.getByText("Now write it from memory")).toBeVisible();
    await write(page, char);
    await expect(page.getByText("Perfect!")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByText("5 learned")).toBeVisible();
  await expect(page.getByText("Next review in 10 min.")).toBeVisible();

  // Nothing due yet; 11 minutes later all 15 cards are.
  await page.getByRole("link", { name: "Back home" }).click();
  await expect(page.getByText("0 due")).toBeVisible();
  await page.clock.setFixedTime(new Date(T0.getTime() + 11 * 60_000));
  await page.reload();
  await expect(page.getByText("15 due")).toBeVisible();
  await page.getByRole("link", { name: "Start" }).click();

  // Session 2: the 15 reviews (then 5 more new kana, up to the daily 10).
  // Answer every card correctly, whatever its type.
  const seen = new Set<string>();
  for (let n = 0; n < 15; n++) {
    await expect(page.getByText(`${n + 1} / 20`)).toBeVisible();
    if (await page.getByText("How is this read?").isVisible()) {
      seen.add("recognize");
      const char = (await page.locator("p.font-hand").first().textContent()) as Kana;
      await page.getByRole("button", { name: KANA[char], exact: true }).click();
      continue;
    }
    let char: string;
    if (await page.getByText("Write what you hear").isVisible()) {
      seen.add("audio");
      const spoken = await page.evaluate(
        () => (window as unknown as { spoken: string[] }).spoken,
      );
      char = spoken.at(-1)!;
    } else {
      seen.add("write");
      await expect(page.getByText("Write the hiragana for")).toBeVisible();
      const cue = await page.locator("p.font-semibold").first().textContent();
      char = BY_ROMAJI[cue!];
    }
    await write(page, char);
    // A second correct answer graduates the card from minutes to days.
    await expect(page.getByText(/Next review: in \d+ days?/)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  expect([...seen].sort()).toEqual(["audio", "recognize", "write"]);

  await expect(page.getByText("A new kana")).toBeVisible();
  await expect(page.getByText("か", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "End session" }).click();
  await expect(page.getByText("0 due")).toBeVisible();
  await expect(page.getByText("5 learned")).toBeVisible();
  await expect(page.getByText("1-day streak")).toBeVisible();
});
