import { expect, test } from "@playwright/test";

test("first launch explains Japanese, then opens the path", async ({ page }) => {
  await page.goto("/");
  // New learners land on the welcome guide, full screen (no tab bar).
  await expect(page.getByRole("heading", { name: "Japanese uses three scripts together" })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "46 sounds. Today, 5." })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Consonant + vowel" })).toBeVisible();
  await expect(page.getByText("k + a")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "From sounds to words" })).toBeVisible();
  await expect(page.getByText("ai · love")).toBeVisible();

  // Skipping lands on the path, with the first stage ready.
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible();
  await expect(page.getByText("Stage 1 · Now")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start" })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();

  // The welcome isn't shown again.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible();
});

test("locked stages can't be opened early", async ({ page }) => {
  await page.goto("/stage/?id=hira-3");
  await expect(page.getByText("Finish the stages before this one first.")).toBeVisible();
});
