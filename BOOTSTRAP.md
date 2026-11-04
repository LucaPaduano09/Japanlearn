# Kakitai — Japanese study app with handwriting practice

> Bootstrap spec for Claude Code. Put this file in the repo root, then tell Claude Code:
> _"Read BOOTSTRAP.md and do Milestone 0."_ Do one milestone at a time and review before moving on.
>
> "Kakitai" (書きたい, "I want to write") is a working title. Rename it if you like.

---

## 1. Product summary

A mobile-first app (iOS + Android, with the web as a free bonus) for learning Japanese, built on **writing by hand**:

- Learners study **kana → kanji → vocabulary** with spaced repetition (SRS).
- Each review can be a **writing card**: the app shows a prompt (meaning, reading, or audio) and the learner writes the character with a finger or stylus on a canvas.
- The app checks **stroke count, order, direction and shape** against reference stroke data and gives feedback right away (correct, wrong stroke, wrong order, sloppy).
- It works **fully offline**. All content ships with the app.

### Non-goals for v1

- User accounts, cloud sync, social features
- Grammar lessons, or free-form sentence writing with a recognition model
- Payments

---

## 2. Tech stack (versions as of Nov 2026)

| Concern               | Choice                                                                                              | Notes                                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework             | **Next.js 16** (App Router, TypeScript)                                                             | Must use **static export** (`output: 'export'`). Capacitor serves static files, so there is no server at runtime.                                                 |
| Native shell          | **Capacitor 8.x**                                                                                   | Pin `^8`. Capacitor 9 is expected around the end of Nov 2026, so upgrade once it is stable. iOS uses Swift Package Manager (the default in Cap 8), not CocoaPods. |
| Styling               | Tailwind CSS v4                                                                                     | Mobile-first. Respect safe areas (`env(safe-area-inset-*)`).                                                                                                      |
| State                 | Zustand                                                                                             | Small, simple stores.                                                                                                                                             |
| Local DB              | Dexie (IndexedDB)                                                                                   | Holds progress, review history and settings. Add JSON export/import as a manual backup.                                                                           |
| SRS                   | `ts-fsrs`                                                                                           | FSRS scheduler, more modern than SM-2.                                                                                                                            |
| Stroke rendering      | `perfect-freehand`                                                                                  | Natural-looking ink from pointer input.                                                                                                                           |
| Stroke reference data | **KanjiVG** (SVG stroke paths for kana + kanji)                                                     | License CC BY-SA 3.0. Attribution required.                                                                                                                       |
| Dictionary data       | **JMdict** (words) + **KANJIDIC2** (kanji info) from EDRDG                                          | License CC BY-SA 4.0. Attribution required. Ship a trimmed subset (JLPT N5–N4 at first).                                                                          |
| Audio                 | `@capacitor-community/text-to-speech` (native), Web Speech API `ja-JP` (web fallback)               |                                                                                                                                                                   |
| Native extras         | `@capacitor/haptics`, `@capacitor/preferences`, `@capacitor/splash-screen`, `@capacitor/status-bar` |                                                                                                                                                                   |
| Fonts                 | Noto Sans JP (UI), **Klee One** (handwriting-style model characters)                                | Use `next/font/google`, which works with static export.                                                                                                           |
| Tests                 | Vitest (unit), Playwright (web e2e)                                                                 |                                                                                                                                                                   |
| Lint/format           | ESLint + Prettier                                                                                   |                                                                                                                                                                   |

Requires Node.js ≥ 20.9, Xcode (for iOS), and Android Studio (for Android).

---

## 3. Static export constraints (important)

Capacitor loads the `out/` folder from the device, so the app must work with **no Next.js server**:

```ts
// next.config.ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // makes /study/ resolve to /study/index.html in the WebView
  images: { unoptimized: true },
};
export default nextConfig;
```

Rules for Claude Code:

- **No** API routes, Server Actions, middleware, `cookies()`, `headers()` or ISR.
- Dynamic routes need `generateStaticParams`, or use query params instead (e.g. `/kanji/?c=日`). Prefer query params for per-character pages, because there are thousands of characters.
- Every component that touches `window`, the canvas, Dexie or Capacitor gets `'use client'`. Guard browser APIs so the static build doesn't crash.
- Load content JSON from `/public/data/*.json` with `fetch` at runtime, or import it at build time for small files.

---

## 4. Bootstrap commands (Milestone 0)

```bash
npx create-next-app@latest kakitai --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd kakitai

npm i zustand dexie ts-fsrs perfect-freehand
npm i @capacitor/core @capacitor/haptics @capacitor/preferences @capacitor/splash-screen @capacitor/status-bar
npm i @capacitor-community/text-to-speech
npm i -D @capacitor/cli vitest @testing-library/react jsdom @playwright/test prettier

npx cap init "Kakitai" "com.yourname.kakitai" --web-dir out
npm i @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.yourname.kakitai",
  appName: "Kakitai",
  webDir: "out",
};
export default config;
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "cap:sync": "npm run build && npx cap sync",
    "ios": "npm run cap:sync && npx cap open ios",
    "android": "npm run cap:sync && npx cap open android",
    "live:android": "npx cap run android --live-reload --host 0.0.0.0 --port 3000",
    "test": "vitest",
    "e2e": "playwright test",
    "data:build": "tsx scripts/build-data.ts"
  }
}
```

Live reload on a device: run `npm run dev -- -H 0.0.0.0` and `npx cap run android --live-reload` (add `--https` if needed). Never commit `server.url` into the config.

---

## 5. Folder structure

```
src/
  app/
    layout.tsx              # fonts, safe-area shell, bottom tab bar
    page.tsx                # Home: due reviews, streak, "Start" button
    learn/page.tsx          # Pick a deck (Hiragana, Katakana, N5 Kanji, N5 Vocab)
    review/page.tsx         # SRS session (mix of card types)
    write/page.tsx          # Free practice: ?c=あ
    kanji/page.tsx          # Character detail: ?c=日
    settings/page.tsx       # Handedness, strictness, audio, backup, credits/licenses
  components/
    writing/
      WritingCanvas.tsx     # pointer capture + perfect-freehand rendering
      StrokeGuide.tsx       # animated stroke-order playback from KanjiVG
      GhostOverlay.tsx      # faint model character (optional hint)
      FeedbackBadge.tsx
    cards/
      WriteCard.tsx         # prompt → write → grade
      RecognizeCard.tsx     # show char → choose meaning/reading
      ListenCard.tsx        # audio → write or choose
    ui/...
  lib/
    strokes/
      kanjivg.ts            # parse SVG paths → point arrays (normalized 0..1)
      resample.ts           # resample a stroke to N evenly spaced points
      compare.ts            # stroke matching + scoring (see §6)
    srs/
      scheduler.ts          # ts-fsrs wrapper
    db/
      schema.ts             # Dexie tables
      backup.ts             # JSON export/import
    content/
      loader.ts             # load decks + character data
    native/
      haptics.ts, tts.ts    # Capacitor with web fallbacks
  store/
    session.ts, settings.ts
public/
  data/
    kana.json
    kanji-n5.json
    vocab-n5.json
    strokes/<codepoint-hex>.json   # preprocessed KanjiVG, one file per character
scripts/
  build-data.ts             # downloads/parses KanjiVG + JMdict + KANJIDIC2 → public/data
```

---

## 6. The handwriting engine (core feature)

### 6.1 Capture

- `<canvas>` sized to its container, scaled by `devicePixelRatio`.
- Use **Pointer Events** (`pointerdown/move/up`) with `setPointerCapture`. Set CSS `touch-action: none` on the canvas so the page doesn't scroll while writing.
- Use `getCoalescedEvents()` where supported for smooth Apple Pencil lines. Use `pressure` for line width when it's available.
- Store each stroke as `{x, y, t}[]` normalized to a 0..1 box.
- Controls: **Undo stroke**, **Clear**, **Hint** (shows the next stroke), **Show answer**.

### 6.2 Reference data

`scripts/build-data.ts` turns KanjiVG SVGs into JSON:

```json
{ "char": "日", "strokes": [[[0.21,0.18],[0.22,0.80]], ...] }
```

Sample each SVG path into points (via `svg-path-properties` in the script), normalize to 0..1 (KanjiVG uses a 109×109 viewBox), and keep stroke order as given.

### 6.3 Grading: stroke-by-stroke, checked live

Grade **each stroke as soon as the finger lifts** (like Skritter). This makes feedback instant and avoids needing an ML model.

For user stroke _i_ against reference stroke _i_:

1. **Resample** both to 32 points.
2. **Direction check**: compare the start→end vectors. If the user's stroke runs the opposite way, flag "wrong direction."
3. **Shape distance**: average point-to-point distance after both are in the same 0..1 frame (no per-stroke normalization, so position still counts). Optionally use DTW (dynamic time warping) to handle speed differences.
4. **Position check**: distance between start points and between end points.
5. **Order check**: if stroke _i_ doesn't match reference _i_ but matches a later reference stroke well, flag "wrong stroke order."

Thresholds depend on the **strictness setting** (Relaxed / Normal / Strict). Keep every constant in `compare.ts` so it can be tuned.

Result per stroke: `ok | sloppy | wrong-direction | wrong-order | miss`.

- `ok` / `sloppy`: snap the stroke to the clean reference path (optional, like a "beautify" toggle), give a light haptic tap, move on.
- `miss`: shake the stroke red, briefly show the correct one, give a warning haptic.

Character grade, which maps to the FSRS rating:

- All strokes ok on the first try → **Easy**
- Some sloppy, no misses → **Good**
- 1–2 misses or hints → **Hard**
- 3+ misses, or "Show answer" used → **Again**

Unit-test `compare.ts` with recorded fixtures: good, mirrored, reversed and out-of-order strokes for あ, 日 and 書.

### 6.4 Stroke-order animation

`StrokeGuide` animates the reference paths one by one (SVG `stroke-dasharray` / `stroke-dashoffset`), with stroke numbers shown. It's used on the detail page and as a hint.

---

## 7. Content & SRS

### Decks (v1)

1. Hiragana (46 + dakuten/handakuten)
2. Katakana
3. JLPT N5 kanji (~80)
4. JLPT N5 vocabulary (~700, written in kana or kanji)

Each deck item becomes several **card types**:

- `write-from-meaning`: "Write the kanji for _sun_" → 日
- `write-from-reading`: "Write: にち / ひ" → 日
- `write-from-audio`: plays "た" → write た
- `recognize`: show 日 → choose the meaning (multiple choice)

For vocabulary, the user writes **each character in sequence** on the same canvas, one box per character.

### Dexie schema (sketch)

```ts
cards: "&id, deckId, itemId, type, due, state"; // FSRS card fields stored inline
reviews: "++id, cardId, ts, rating, durationMs, mistakes";
settings: "&key";
```

### Session flow

Home shows "N due." A session takes up to 20 due cards plus up to 5 new ones (configurable). New items get a short intro: the animation first, then trace with the ghost overlay, then write from memory.

---

## 8. UX notes

- **Mobile-first**: the canvas takes most of the screen, with a large hit area and the prompt above it.
- **Handedness setting** moves the controls to the left or right side.
- A grid guide (cross lines) inside the box, like a 田字格 practice square.
- Dark mode.
- Respect safe areas, and hide the status bar during writing sessions if that feels better.
- All text in English (UI) and Japanese (content). Keep i18n-ready strings in one file so Italian or other languages are easy to add later.

---

## 9. Licensing (must ship in-app)

A **Credits** screen in Settings must include:

- KanjiVG: © Ulrich Apel, CC BY-SA 3.0, with a link
- JMdict / KANJIDIC2: © Electronic Dictionary Research and Development Group, CC BY-SA 4.0, with a link
- Fonts: SIL Open Font License

Note: share-alike applies to the **data files** you redistribute, not to your app code.

---

## 10. Milestones (give Claude Code one at a time)

**M0 — Scaffold**
Create the project with §4, the config from §3 and the folder skeleton from §5. Add a placeholder home page and a bottom tab bar. Verify that `npm run build` produces `out/`, and that the app runs in the iOS simulator and Android emulator.
✅ Done when the app opens on both platforms and shows the home screen.

**M1 — Writing canvas**
`WritingCanvas` with smooth ink, undo, clear, `touch-action: none`, DPR scaling and normalized stroke output. Add a `/write` demo page that logs strokes.
✅ Done when writing feels smooth on a real phone, with no page scroll and no lag.

**M2 — Data pipeline**
`scripts/build-data.ts` writes kana, N5 kanji stroke JSON, and N5 kanji/vocab entries to `public/data`. Add `StrokeGuide` animation and the `/kanji?c=` detail page.
✅ Done when 日 animates correctly and the detail page shows its readings and meanings.

**M3 — Stroke grading**
`resample.ts` and `compare.ts` with unit tests (§6.3), wired into `/write` with live per-stroke feedback and haptics.
✅ Done when the tests pass and writing あ/日/書 gives sensible feedback, including detection of reversed and out-of-order strokes.

**M4 — SRS + decks**
Dexie schema, ts-fsrs wrapper, deck picker, review session with all card types, and the new-item intro flow.
✅ Done when you can learn 5 hiragana, review them, and see due dates move.

**M5 — Polish**
TTS, settings (strictness, handedness, daily limits), dark mode, backup export/import, Credits screen, splash screen and icons.

**M6 — Ship prep**
App icons and splash via `@capacitor/assets`, plus store metadata. Run e2e tests (Playwright on the web build) and a manual device test checklist.

---

## 11. Suggested `CLAUDE.md` (create it in M0)

```md
# Kakitai — notes for Claude

- Next.js 16 App Router with `output: 'export'`. NO server features (API routes, server actions, middleware).
- Capacitor 8 wraps `out/`. After web changes: `npm run cap:sync`.
- Anything using window/canvas/Dexie/Capacitor must be a client component, with browser APIs guarded.
- Handwriting logic lives in src/lib/strokes; it must stay pure TS and unit-tested.
- Grading thresholds are constants in compare.ts; don't scatter magic numbers.
- Content JSON in public/data is generated by scripts/build-data.ts; don't hand-edit it.
- Run `npm test` and `npm run build` before saying a task is done.
- Keep KanjiVG/EDRDG attribution intact.
```

---

## 12. Later ideas (post-v1)

- An on-device ML recognizer for free writing (e.g. a small TFLite/ONNX model) for writing whole words without a prompt
- Cloud sync (Supabase), streaks and leaderboards
- N4–N1 decks, plus radicals/components view
- An iPad layout with a larger canvas and Apple Pencil-only mode (ignore finger touches)
- Upgrade to Capacitor 9 once it's released and plugins support it
