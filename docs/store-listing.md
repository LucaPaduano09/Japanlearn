# Store listing — Kakitai 1.0

Copy for App Store Connect and Google Play Console. Fields marked **TODO**
need a decision or a URL before submitting.

## Identity

| Field | Value |
| --- | --- |
| App name | Kakitai |
| Subtitle (iOS, 30 chars) | Learn Japanese by handwriting |
| Bundle / application id | `com.lucapaduano.kakitai` |
| Version | 1.0.0 (build 1) — keep `package.json`, `android/app/build.gradle` (`versionName`/`versionCode`) and Xcode (`MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`) in step |
| Category | Education (secondary: Reference) |
| Age rating | 4+ / Everyone (no user content, ads, purchases or web browsing) |
| Price | Free, no in-app purchases |
| Languages | English and Italian (UI), Japanese (content) |
| Support URL | **TODO** |
| Privacy policy URL | **TODO** — host the text in the Privacy section below |
| Contact email | **TODO** |

## Short description (Google Play, 80 chars)

Learn hiragana, katakana and 284 kanji (JLPT N5–N4) by writing them by hand.

## Promotional text (iOS, 170 chars)

Write Japanese with your finger or stylus. Kakitai checks every stroke as you draw it and brings each character back right before you'd forget it.

## Full description

Kakitai (書きたい, "I want to write") teaches Japanese the way it sticks: by writing it by hand.

WRITE, DON'T JUST TAP
• Write every kana and kanji on a practice square with your finger or a stylus.
• Each stroke is checked the moment you lift your finger: shape, position, direction and stroke order.
• Wrong direction or wrong order? You see the correct stroke right away.

LEARN STEP BY STEP
• Hiragana, katakana, all 284 JLPT N5 and N4 kanji and about 1,300 words.
• Every new character starts with its stroke-order animation, then tracing, then writing from memory.
• One guided path: hiragana row by row, then katakana, kanji and words. Every stage explains its row and leaves you real words to read.

REMEMBER IT FOR GOOD
• Spaced repetition (FSRS) schedules each card right before you'd forget it.
• Cards mix writing from meaning, from reading, from audio, and recognition.
• Short stages and a streak keep the habit small and steady.

MADE FOR PRACTICE
• Works fully offline: everything ships with the app.
• No account, no ads, no tracking. Your progress stays on your device; export a backup anytime.
• Dark mode, left-handed layout and adjustable grading strictness.

Built on open data from KanjiVG and the Electronic Dictionary Research and Development Group (KANJIDIC2/JMdict).

## Keywords (iOS, 100 chars)

japanese,kanji,hiragana,katakana,handwriting,stroke order,JLPT,N5,kana,writing,flashcards,SRS

## What's new (1.0)

First release: hiragana, katakana, N5 kanji and vocabulary with handwriting practice and spaced repetition.

## Privacy

App Store "App Privacy": **Data Not Collected**. Google Play "Data safety": no
data collected or shared; data is not encrypted in transit because none is
sent.

Privacy policy text to host:

> Kakitai does not collect, store on servers, or share any personal data. Your
> study progress and settings are saved only on your device. A backup file is
> created only when you choose "Export backup", and you decide where it goes.
> The app needs no account and makes no network requests while you use it.

## Screenshots

Required sizes: iPhone 6.9" (1320×2868), iPad 13" if iPad is supported, and
Android phone (min. 2 screenshots, 16:9 or 9:16). Suggested shots, in light
mode, with a few days of progress so the badges aren't empty:

1. Welcome: the three scripts in one colored sentence.
2. Trace step on a kanji (highlighted next stroke on the 田字格 grid).
3. A "Wrong order" feedback moment in a write card.
4. Kanji lesson meaning step (on/kun reading cards).
5. Session complete with next review dates.
6. The path with a completed stage and its reward words.
7. Dark mode write card.

## Licensing notes for review

The shipped data files are CC BY-SA (KanjiVG 3.0, EDRDG 4.0); attribution is in
Settings → Credits & licenses. The app code itself is not affected by the
share-alike terms.
