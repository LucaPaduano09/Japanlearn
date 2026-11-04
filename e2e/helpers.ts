import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export function refs(char: string): [number, number][][] {
  const hex = char.codePointAt(0)!.toString(16).padStart(5, "0");
  return JSON.parse(readFileSync(`public/data/strokes/${hex}.json`, "utf8")).strokes;
}

/** Draws strokes (0..1 box coords) onto the writing canvas. */
export async function draw(page: Page, strokes: [number, number][][]) {
  const canvas = page.locator("canvas");
  await expect.poll(async () => (await canvas.boundingBox())?.width ?? 0).toBeGreaterThan(100);
  const box = (await canvas.boundingBox())!;
  for (const [first, ...rest] of strokes) {
    await page.mouse.move(box.x + first[0] * box.width, box.y + first[1] * box.height);
    await page.mouse.down();
    for (const [x, y] of rest) {
      await page.mouse.move(box.x + x * box.width, box.y + y * box.height);
    }
    await page.mouse.up();
  }
}

/** Writes a character with its reference strokes, in order. */
export function write(page: Page, char: string) {
  return draw(page, refs(char));
}

/** Records what text-to-speech is asked to say, in window.spoken. */
export async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push(u.text);
    };
  });
}
