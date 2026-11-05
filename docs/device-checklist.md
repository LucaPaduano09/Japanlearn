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

- [ ] New install: the welcome guide explains the three scripts, vowels, consonant + vowel and words; "Start the first stage" opens The 5 vowels.
- [ ] A stage goes intro → each sound (meet → watch → trace → write) → reward words with romaji and meaning; the path then shows the next stage as current.
- [ ] After 10 minutes the 15 cards are due ("15 to review" on the path); reviewing them correctly moves them to days.
- [ ] Language: System follows the phone; Italiano / English switch the whole app immediately and persist.
- [ ] Each card type works: write from reading, write from audio, recognize, and (Kanji / Vocab decks) write from meaning and from reading.
- [ ] Vocabulary: a multi-character word is written one box at a time.
- [ ] Kanji stages: meaning and one word first, "How is it read?" opens the readings; "How kanji are read" returns to the stage.
- [ ] Streak goes up after a session and survives closing the app.

## Audio

- [ ] Kana and words are spoken in Japanese at a learner-friendly speed.
- [ ] Settings shows "Japanese voice available"; without a Japanese voice it explains how to install one.
- [ ] Muted / silent switch behaves as expected for the platform.

## Speaking

- [ ] First "Read it aloud" card asks for the microphone (and, on iOS, speech recognition) once; denying shows the "allow the microphone" message and "Can't speak now" still moves on.
- [ ] Saying the word (kana-only and with kanji) is accepted; a different word shows "I heard …" and the tries left; three misses count as wrong.
- [ ] Listening stops by itself about 1.5 s after you finish, and when tapping the microphone again.
- [ ] After answering aloud, the reading is still spoken (TTS plays through the speaker, not the earpiece, on iOS).
- [ ] "Can't speak now" removes the remaining speaking cards from the session; turning off "Speaking practice" hides them from the due count.
- [ ] A device without Japanese recognition: Settings explains it and no speaking cards appear.

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
