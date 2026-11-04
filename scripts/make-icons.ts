/**
 * Renders the app icon and splash sources with Playwright (so the glyph uses
 * the real Klee One font):
 *  - assets/*.png: sources for `npx capacitor-assets generate` (iOS/Android)
 *  - src/app/icon.png, src/app/apple-icon.png: web icons (Next file conventions)
 * Run with `npm run icons:build`; commit the output.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = path.join(import.meta.dirname, "..");
const ACCENT = "#c2410c";
const ACCENT_DARK = "#fb923c";
const PAPER = "#faf7f2";
const INK_DARK = "#141414";
const GLYPH = "書";

interface Target {
  file: string;
  size: number;
  background: string | null; // null = transparent
  color: string;
  /** Glyph height as a fraction of the canvas. */
  scale: number;
  grid: boolean;
}

// Android adaptive icons crop to a circle/squircle: keep the glyph in the
// central ~60% safe zone. Splash screens are cropped to many aspect ratios.
const TARGETS: Target[] = [
  { file: "assets/icon-only.png", size: 1024, background: ACCENT, color: "#fff", scale: 0.62, grid: true },
  { file: "assets/icon-foreground.png", size: 1024, background: null, color: "#fff", scale: 0.42, grid: false },
  { file: "assets/icon-background.png", size: 1024, background: ACCENT, color: "#fff", scale: 0, grid: true },
  { file: "assets/splash.png", size: 2732, background: PAPER, color: ACCENT, scale: 0.16, grid: false },
  { file: "assets/splash-dark.png", size: 2732, background: INK_DARK, color: ACCENT_DARK, scale: 0.16, grid: false },
  { file: "src/app/icon.png", size: 512, background: ACCENT, color: "#fff", scale: 0.62, grid: true },
  { file: "src/app/apple-icon.png", size: 180, background: ACCENT, color: "#fff", scale: 0.62, grid: true },
];

function html(t: Target): string {
  const line = "rgba(255,255,255,0.28)";
  const grid = t.grid
    ? `<div style="position:absolute;left:50%;top:6%;bottom:6%;border-left:${Math.max(2, t.size / 170)}px dashed ${line}"></div>
       <div style="position:absolute;top:50%;left:6%;right:6%;border-top:${Math.max(2, t.size / 170)}px dashed ${line}"></div>`
    : "";
  return `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Klee+One:wght@600&display=block" rel="stylesheet">
<style>html,body{margin:0;background:transparent}
#c{position:relative;width:${t.size}px;height:${t.size}px;background:${t.background ?? "transparent"};
display:flex;align-items:center;justify-content:center;overflow:hidden}
#g{font-family:'Klee One',serif;font-weight:600;color:${t.color};font-size:${t.size * t.scale}px;line-height:1;transform:translateY(-0.05em)}</style>
</head><body><div id="c">${grid}${t.scale > 0 ? `<span id="g">${GLYPH}</span>` : ""}</div></body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const t of TARGETS) {
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(html(t), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(ROOT, t.file);
    await mkdir(path.dirname(out), { recursive: true });
    await page.locator("#c").screenshot({ path: out, omitBackground: t.background === null });
    console.log(`  ${t.file} (${t.size}px)`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
