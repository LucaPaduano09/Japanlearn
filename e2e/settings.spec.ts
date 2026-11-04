import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("settings persist, switch the theme, and back up progress", async ({ page }) => {
  await page.goto("/settings/");

  // Theme: dark sticks across reloads, before React even loads.
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("radio", { name: "Strict" }).click();
  await page.getByRole("button", { name: "More: Reviews per session" }).click();
  await expect(page.getByText("25", { exact: true })).toBeVisible();
  // Let the IndexedDB write land before reloading.
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Strict" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("25", { exact: true })).toBeVisible();
  await page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio", { name: "System" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);

  // Export a backup, change something, import it back.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^kakitai-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const json = await readFile((await file.path())!, "utf8");
  expect(JSON.parse(json)).toMatchObject({ app: "kakitai", version: 1 });

  await page.getByRole("radio", { name: "Relaxed" }).click();
  await page.getByTestId("backup-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(json),
  });
  await expect(page.getByRole("alertdialog")).toContainText("Replace all progress");
  await page.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByText("Backup restored.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Strict" })).toHaveAttribute("aria-checked", "true");

  // Not a backup.
  await page.getByTestId("backup-file").setInputFiles({
    name: "x.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"hello":1}'),
  });
  await expect(page.getByText("That file isn't a Kakitai backup.")).toBeVisible();

  // Credits (license attribution must ship in-app).
  await page.getByRole("link", { name: "Credits & licenses" }).click();
  await expect(page.getByRole("link", { name: "KanjiVG" })).toBeVisible();
  await expect(page.getByText("CC BY-SA 3.0")).toBeVisible();
  await expect(page.getByText("© Electronic Dictionary Research and Development Group")).toBeVisible();
  await expect(page.getByText("SIL Open Font License 1.1")).toBeVisible();
});
