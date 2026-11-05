import { expect, test } from "@playwright/test";

test("kanji detail page animates 日 and shows its readings and meanings", async ({
  page,
}) => {
  await page.goto("/kanji/?c=%E6%97%A5");

  await expect(page.getByRole("heading", { name: "日" })).toBeVisible();
  await expect(page.getByText("4 strokes")).toBeVisible();
  await expect(page.getByText("ニチ、ジツ")).toBeVisible();
  await expect(
    page.getByText("day, sun, Japan, counter for days"),
  ).toBeVisible();

  const strokePaths = page.locator('svg[viewBox="0 0 100 100"] path');
  await expect(strokePaths).toHaveCount(4);

  // The animation draws each stroke in; after a beat the first one should
  // have reached its final (fully drawn) offset.
  await page.waitForTimeout(600);
  const offset = await strokePaths
    .first()
    .evaluate((el) => getComputedStyle(el).strokeDashoffset);
  expect(offset).toBe("0px");
});

test("N4 kanji have detail pages too", async ({ page }) => {
  await page.goto("/kanji/?c=%E6%B5%B7"); // 海
  await expect(page.getByRole("heading", { name: "海" })).toBeVisible();
  await expect(page.getByText("sea, ocean")).toBeVisible();
});
