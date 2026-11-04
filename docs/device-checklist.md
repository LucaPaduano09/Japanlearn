# Device test checklist

Run before each store submission on at least one real iPhone and one real
Android phone (plus an iPad / tablet if tablets are supported). Automated
coverage: `npm test` (unit) and `npm run e2e` (Playwright on the static build,
Pixel 7 viewport).

Build: `npm run cap:sync`, then `npm run ios` / `npm run android` and run a
**release** build on the device.

Start each run from a fresh install, then repeat the marked (↻) items after
updating over the previous release.

## Launch

- [ ] Splash shows the 書 mark, then fades to Home with no white flash (light and dark system theme).
- [ ] Status bar text is readable in light and dark theme; nothing sits under the notch / Dynamic Island or the home indicator.
- [ ] Airplane mode: the whole app works offline (lessons, reviews, kanji pages, audio if the voice is installed).
- [ ] ↻ Progress from the previous version is still there after updating.

## Writing (the core)

- [ ] Writing feels smooth with a finger: no lag, no page scroll or bounce while drawing.
- [ ] Apple Pencil / stylus: lines follow the pen, pressure changes the width.
- [ ] Rotating the device resizes the box and keeps the strokes in place.
- [ ] あ, 日, 書: correct strokes are accepted; a reversed stroke says "Wrong direction"; a later stroke drawn early says "Wrong order".
- [ ] Each accepted stroke gives a light tap; a miss gives a warning buzz; a finished character a success buzz (haptics on).
- [ ] Grading: Relaxed / Strict in Settings noticeably changes what's accepted.
- [ ] Writing hand: Left puts Hint on the left, Right on the right.

## Learning and reviews

- [ ] New install: Home shows "0 due · 5 new"; Start introduces あいうえお (meet → watch → trace → write).
- [ ] After 10 minutes the 15 cards are due; reviewing them correctly moves them to days.
- [ ] Each card type works: write from reading, write from audio, recognize, and (Kanji / Vocab decks) write from meaning and from reading.
- [ ] Vocabulary: a multi-character word is written one box at a time.
- [ ] Turning on Katakana / N5 Kanji / N5 Vocab in Learn adds their items to sessions; the daily new-item limit is respected.
- [ ] Kanji course: finishing a lesson kanji adds its cards to reviews; progress shows on the Learn page.
- [ ] Streak goes up after a session and survives closing the app.

## Audio

- [ ] Kana and words are spoken in Japanese at a learner-friendly speed.
- [ ] Settings shows "Japanese voice available"; without a Japanese voice it explains how to install one.
- [ ] Muted / silent switch behaves as expected for the platform.

## Settings, backup, credits

- [ ] Theme System / Light / Dark switches immediately, persists after a restart, and the ink color follows it.
- [ ] Export backup opens the share sheet; saving to Files / Drive works.
- [ ] Import that backup on a second device (or after reinstalling): confirmation shows, progress comes back.
- [ ] Importing a random JSON file shows "isn't a Kakitai backup" and changes nothing.
- [ ] Credits & licenses lists KanjiVG, EDRDG, jlpt-word-list and the fonts; links open in the browser.

## Store readiness

- [ ] App icon looks right on the home screen, in settings and in the app switcher (Android: round and squircle masks).
- [ ] Version in Settings matches the store version.
- [ ] Write tab: free canvas works, "Practice" with a character opens trace → from memory; "Practice writing" on a kanji page does the same.
