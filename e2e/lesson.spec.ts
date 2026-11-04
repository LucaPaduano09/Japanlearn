import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

function refs(hex: string): [number, number][][] {
  return JSON.parse(readFileSync(`public/data/strokes/${hex}.json`, "utf8"))
    .strokes;
}

/** Draws reference strokes (0..1 box coords) onto the writing canvas. */
async function write(page: Page, strokes: [number, number][][]) {
  const canvas = page.locator("canvas");
  await expect
    .poll(async () => (await canvas.boundingBox())?.width ?? 0)
    .toBeGreaterThan(100);
  const box = (await canvas.boundingBox())!;
  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    await page.mouse.move(
      box.x + first[0] * box.width,
      box.y + first[1] * box.height,
    );
    await page.mouse.down();
    for (const [x, y] of rest) {
      await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
    }
    await page.mouse.up();
  }
}

test("first lesson teaches 一 then moves on to 二, and remembers progress", async ({
  page,
}) => {
  // Record what text-to-speech is asked to say.
  await page.addInitScript(() => {
    const spoken: { text: string; lang: string }[] = [];
    (window as unknown as { spoken: typeof spoken }).spoken = spoken;
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push({ text: u.text, lang: u.lang });
    };
  });
  await page.goto("/learn/");
  // New learners go through the readings intro first.
  await page
    .getByRole("link", { name: "Start here: how kanji are read" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "A kanji is a character with a meaning",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/not modern Chinese/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("button", { name: "Listen: まいにち" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/usually kun'yomi/)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("button", { name: "Listen: あした" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start the first lesson" }).click();

  // Meaning step
  await expect(page.getByText("一", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("one", { exact: true }).first()).toBeVisible();
  // Readings show romaji and can be listened to.
  await expect(
    page.getByRole("button", { name: "Listen: イチ" }),
  ).toContainText("ichi");
  const hitotsu = page.getByRole("button", {
    name: "Listen: ひと",
    exact: true,
  });
  await expect(hitotsu).toContainText("hitotsu");
  await expect(hitotsu).toContainText("一つ"); // written with okurigana
  // Words sit under the reading they use: 一日 under イチ, 一つ under ひと
  await expect(
    page.getByRole("button", { name: "Listen: いちにち" }),
  ).toBeVisible();
  await hitotsu.click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { spoken: unknown[] }).spoken),
    )
    .toContainEqual({ text: "ひとつ", lang: "ja-JP" });
  await page.getByRole("button", { name: "See how to write it" }).click();

  // Watch → trace
  await page.getByRole("button", { name: "Trace it" }).click();
  const one = refs("04e00");
  await write(page, [[...one[0]].reverse()]); // backwards: rejected
  await expect(page.getByText(/Wrong direction/)).toBeVisible();
  await write(page, one);

  // From memory
  await expect(page.getByText("Now write it from memory")).toBeVisible();
  await write(page, one);
  await expect(page.getByText("Perfect!")).toBeVisible();
  await page.getByRole("button", { name: "Next kanji" }).click();
  await expect(page.getByText("2 of 14")).toBeVisible();

  // 二: out of order in recall → wrong order, then correct
  await page.getByRole("button", { name: "See how to write it" }).click();
  await page.getByRole("button", { name: "Trace it" }).click();
  const two = refs("04e8c");
  await write(page, two);
  await expect(page.getByText("Now write it from memory")).toBeVisible();
  await write(page, [two[1]]);
  await expect(page.getByText(/Wrong order/)).toBeVisible();
  await write(page, two);
  await expect(page.getByText("Got it, with some help")).toBeVisible();

  // Progress persists on the lesson list
  await page.goto("/learn/");
  await expect(
    page.getByRole("link", { name: /Continue: Numbers/ }),
  ).toBeVisible();
  await expect(page.getByText("2 / 14")).toBeVisible();

  // Completed kanji can be reopened and redone
  await page.getByRole("link", { name: "Open 一" }).click();
  await expect(
    page.getByRole("button", { name: "Pick a kanji" }),
  ).toContainText("1 of 14");
  await expect(page.getByText("one", { exact: true }).first()).toBeVisible();

  // ...and any kanji of the lesson can be picked from inside it
  await page.getByRole("button", { name: "Pick a kanji" }).click();
  await page.getByRole("button", { name: "五", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pick a kanji" }),
  ).toContainText("6 of 14");
  await expect(page.getByText("five", { exact: true }).first()).toBeVisible();
});
