import kana from "../public/data/kana.json" with { type: "json" };
import { expect, test, type Page } from "@playwright/test";
import { draw, refs } from "./helpers";

/** Imports a backup where every kana is already learned, so the kanji stages open. */
async function learnAllKana(page: Page) {
  const backup = {
    app: "kakitai",
    version: 1,
    exportedAt: Date.now(),
    cards: [],
    reviews: [],
    items: kana.map((k) => ({
      id: `${k.kind}|${k.char}`,
      deckId: k.kind,
      itemId: k.char,
      introducedAt: Date.now(),
      grade: "good",
    })),
    settings: [{ key: "settings", value: { welcomeSeen: true } }],
  };
  await page.goto("/settings/");
  await page.getByTestId("backup-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByText("Backup restored.")).toBeVisible();
}

test("each kana row explains consonant + vowel and its exceptions", async ({ page }) => {
  await learnAllKana(page);
  // Redo the S row: し is flagged as irregular.
  await page.goto("/stage/?id=hira-3");
  await expect(page.getByRole("heading", { name: "The S row" })).toBeVisible();
  await expect(page.getByText("Each sound is s + a vowel.")).toBeVisible();
  await expect(page.getByText("Careful: し is read \"shi\".")).toBeVisible();

  await page.goto("/stage/?id=hira-11");
  await expect(page.getByRole("heading", { name: "Two little marks: ゛" })).toBeVisible();
  await expect(page.getByText("か (ka) → が (ga)")).toBeVisible();
});

test("the first kanji stage: readings stay folded until asked, strokes are graded", async ({ page }) => {
  await learnAllKana(page);
  await page.goto("/");
  await expect(page.getByText("Numbers 1/3")).toBeVisible();
  await page.getByRole("link", { name: "Start" }).click();

  await expect(page.getByRole("heading", { name: "Now kanji" })).toBeVisible();
  await expect(page.getByRole("link", { name: /How kanji are read/ })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();

  // Meaning first; on/kun readings only on request.
  await expect(page.getByText("一", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("On'yomi")).toHaveCount(0);
  await page.getByRole("button", { name: "How is it read?" }).click();
  await expect(page.getByText("On'yomi")).toBeVisible();

  await page.getByRole("button", { name: "See how to write it" }).click();
  await page.getByRole("button", { name: "Trace it" }).click();
  const [stroke] = refs("一");
  await draw(page, [[...stroke].reverse()]);
  await expect(page.getByText(/Wrong direction/)).toBeVisible();
});

test("the app speaks Italian when asked to", async ({ page }) => {
  await learnAllKana(page);
  await page.getByRole("radio", { name: "Italiano" }).click();
  await expect(page.getByRole("heading", { name: "Profilo" })).toBeVisible();
  await expect(page.getByText("I significati di kanji e parole, per ora, sono in inglese.")).toBeVisible();
  await page.getByRole("link", { name: "Percorso" }).click();
  await expect(page.getByRole("heading", { name: "Il tuo percorso" })).toBeVisible();
  await expect(page.getByText("Numeri 1/3")).toBeVisible();

  await page.goto("/stage/?id=hira-1");
  await expect(page.getByRole("heading", { name: "Le 5 vocali" })).toBeVisible();
  await expect(page.getByText("Si leggono come in italiano")).toBeVisible();
});
