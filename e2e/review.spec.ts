import { expect, test } from "@playwright/test";
import { recordSpeech, write } from "./helpers";

const KANA = { あ: "a", い: "i", う: "u", え: "e", お: "o" } as const;
type Kana = keyof typeof KANA;
const BY_ROMAJI = Object.fromEntries(Object.entries(KANA).map(([k, r]) => [r, k as Kana]));

const T0 = new Date("2026-11-04T09:00:00");

test("finish the first stage, review it, and see due dates move", async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(T0);
  await recordSpeech(page);

  // Welcome → first stage: the five vowels.
  await page.goto("/");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Start the first stage" }).click();
  await expect(page.getByRole("heading", { name: "The 5 vowels" })).toBeVisible();
  await expect(page.getByText("They're read like in Italian")).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();

  for (const char of Object.keys(KANA)) {
    await expect(page.getByText("A new sound")).toBeVisible();
    await expect(page.getByText(char, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "See how to write it" }).click();
    await page.getByRole("button", { name: "Trace it" }).click();
    await write(page, char);
    await expect(page.getByText("Now from memory")).toBeVisible();
    await write(page, char);
    await expect(page.getByText("Perfect!")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
  }

  // The stage leaves real words to read.
  await expect(page.getByText("Stage complete")).toBeVisible();
  await expect(page.getByText("ai · love")).toBeVisible();
  await page.getByRole("button", { name: "Back to the path" }).click();
  await expect(page.getByText("Stage 2 · Now")).toBeVisible();
  await expect(page.getByText("K row")).toBeVisible();

  // Nothing to review yet; 11 minutes later all 15 cards are due.
  await expect(page.getByText(/to review/)).toHaveCount(0);
  await page.clock.setFixedTime(new Date(T0.getTime() + 11 * 60_000));
  await page.reload();
  await expect(page.getByText("15 to review")).toBeVisible();
  await page.getByRole("link", { name: /15 to review/ }).click();

  const seen = new Set<string>();
  for (let n = 0; n < 15; n++) {
    await expect(page.getByText(`${n + 1} / 15`)).toBeVisible();
    // Wait for the card itself before checking which kind it is.
    await expect(
      page
        .getByText("How is this read?")
        .or(page.getByText("Write what you hear"))
        .or(page.getByText("Write the hiragana for")),
    ).toBeVisible();
    if (await page.getByText("How is this read?").isVisible()) {
      seen.add("recognize");
      const char = (await page.locator("p.font-hand").first().textContent()) as Kana;
      await page.getByRole("button", { name: KANA[char], exact: true }).click();
      continue;
    }
    let char: string;
    if (await page.getByText("Write what you hear").isVisible()) {
      seen.add("audio");
      const spoken = await page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);
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

  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.getByText("15 reviewed")).toBeVisible();
  await page.getByRole("link", { name: "Back to the path" }).click();
  await expect(page.getByText(/to review/)).toHaveCount(0);
  await expect(page.getByText("1-day streak")).toBeVisible();
});
