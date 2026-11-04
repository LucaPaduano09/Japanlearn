import { expect, test } from "@playwright/test";

test("drawing on the canvas records strokes; undo and clear remove them", async ({
  page,
}) => {
  const logs: string[] = [];
  page.on("console", (msg) => logs.push(msg.text()));
  await page.goto("/write/");

  const canvas = page.locator("canvas");
  const box = (await canvas.boundingBox())!;
  const scrollBefore = await page.evaluate(() => window.scrollY);

  const drag = async (x0: number, y0: number, x1: number, y1: number) => {
    await page.mouse.move(box.x + box.width * x0, box.y + box.height * y0);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * x1, box.y + box.height * y1, {
      steps: 12,
    });
    await page.mouse.up();
  };

  await drag(0.2, 0.3, 0.8, 0.3);
  await drag(0.5, 0.1, 0.5, 0.9);
  await expect(page.getByText("2 strokes")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  expect(logs.some((l) => l.startsWith("stroke 1"))).toBe(true);

  // Ink actually reached the canvas.
  const inked = await canvas.evaluate((c: HTMLCanvasElement) => {
    const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(100);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("1 stroke", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText("0 strokes")).toBeVisible();
});

test("practicing one character: trace, then write it from memory", async ({ page }) => {
  await page.goto("/kanji/?c=%E4%B8%80"); // 一
  await page.getByRole("link", { name: "Practice writing" }).click();
  await expect(page.getByRole("radio", { name: "Trace" })).toHaveAttribute("aria-checked", "true");

  const canvas = page.locator("canvas");
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(100);
  const box = (await canvas.boundingBox())!;
  // 一 is one stroke, left to right across the middle.
  const draw = async () => {
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.53);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5, { steps: 16 });
    await page.mouse.up();
  };
  await draw();
  await expect(page.getByRole("radio", { name: "From memory" })).toHaveAttribute("aria-checked", "true");
  await draw();
  await expect(page.getByRole("button", { name: "Write it again" })).toBeVisible();
});
