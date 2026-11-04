import { expect, test } from "@playwright/test";

test("home shows the start button and tab bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start" })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});
