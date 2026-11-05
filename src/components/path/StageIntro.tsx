"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Furigana } from "@/components/ui/Furigana";
import { PrimaryButton } from "@/components/ui/Button";
import { speak } from "@/lib/native/tts";
import type { Library } from "@/lib/content/library";
import { rowBreakdown, voicedBase, type Stage } from "@/lib/path/stages";
import { itemKey } from "@/lib/srs/decks";
import { strings } from "@/lib/strings";

/**
 * A stage's opening screen: what this row of the table is (vowels,
 * consonant + vowel, ゛ and ゜…), or which kanji and words are coming.
 */
export function StageIntro({
  stage,
  library,
  returnTo,
  onStart,
}: {
  stage: Stage;
  library: Library;
  returnTo: string;
  onStart: () => void;
}) {
  const t = strings.stage.intro;
  const intro = stage.intro;
  const kana = stage.items.map((c) => ({ char: c, romaji: library.kana.get(c)?.romaji ?? c }));

  let body: ReactNode;
  switch (intro.kind) {
    case "vowels":
      body = (
        <>
          {intro.firstKatakana && (
            <Panel title={t.katakanaTitle} text={t.katakanaBody}>
              <Pairs
                pairs={kana.map(({ char }) => [String.fromCodePoint(char.codePointAt(0)! - 0x60), char])}
              />
            </Panel>
          )}
          <Panel title={t.vowelsTitle} text={t.vowelsBody}>
            <Tiles tiles={kana.map((k) => ({ char: k.char, label: k.romaji }))} />
          </Panel>
        </>
      );
      break;
    case "row": {
      const parts = rowBreakdown(kana, intro.consonant);
      body = (
        <Panel title={t.rowTitle(intro.consonant)} text={t.rowBody(intro.consonant)}>
          <Tiles
            tiles={parts.map((p) => ({
              char: p.char,
              top: `${p.consonant} + ${p.vowel}`,
              label: p.romaji,
              strong: p.irregular,
            }))}
          />
          {parts
            .filter((p) => p.irregular)
            .map((p) => (
              <p key={p.char} className="text-sm font-medium text-accent">
                {t.irregular(p.char, p.romaji)}
              </p>
            ))}
        </Panel>
      );
      break;
    }
    case "y-row":
      body = (
        <Panel title={t.yRowTitle} text={t.yRowBody}>
          <Tiles tiles={kana.map((k) => ({ char: k.char, label: k.romaji }))} />
        </Panel>
      );
      break;
    case "w-row":
      body = (
        <Panel title={t.wRowTitle} text={t.wRowBody(kana[0].char, kana[1].char, kana[2].char)}>
          <Tiles tiles={kana.map((k) => ({ char: k.char, label: k.romaji }))} />
        </Panel>
      );
      break;
    case "voiced":
    case "semivoiced": {
      const semi = intro.kind === "semivoiced";
      body = (
        <Panel
          title={semi ? t.semivoicedTitle : t.voicedTitle}
          text={semi ? t.semivoicedBody : t.voicedBody}
        >
          <ul className="flex flex-col gap-2">
            {kana.map((k) => {
              const base = voicedBase(k.char, semi);
              const baseRomaji = library.kana.get(base)?.romaji ?? base;
              return (
                <li key={k.char} lang="ja" className="font-hand text-2xl">
                  {t.becomes(base, baseRomaji, k.char, k.romaji)}
                </li>
              );
            })}
          </ul>
        </Panel>
      );
      break;
    }
    case "kanji":
      body = (
        <>
          {intro.levelStart && (
            <Panel
              title={t.levelTitle(intro.levelStart)}
              text={t.levelBody(library.decks[`kanji-${intro.levelStart}`].length)}
            />
          )}
          {intro.first && (
            <Panel title={t.furiganaTitle} text={t.furiganaBody}>
              <div className="flex items-center gap-5 rounded-2xl border border-border bg-surface p-4">
                <Furigana expression="毎日" reading="まいにち" className="font-hand shrink-0 text-6xl" />
                <ul className="flex flex-col gap-4 text-sm font-medium">
                  <li>↑ {t.furiganaTop}</li>
                  <li>↓ {t.furiganaBottom}</li>
                </ul>
              </div>
              <p className="text-sm text-muted">{t.furiganaNote}</p>
            </Panel>
          )}
          {intro.first && (
            <Panel title={t.kanjiTitle} text={t.kanjiBody}>
              <Link
                href={`/learn/intro/?from=${encodeURIComponent(returnTo)}`}
                className="flex min-h-12 items-center justify-between rounded-xl border border-border px-4 font-medium active:opacity-70"
              >
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-on px-1.5 font-hand text-white">音</span>
                  <span className="rounded-md bg-kun px-1.5 font-hand text-white">訓</span>
                  {t.kanjiReadings}
                </span>
                <span aria-hidden>→</span>
              </Link>
            </Panel>
          )}
          <Panel title={t.kanjiMeet}>
            <ItemList
              items={stage.items.map((c) => {
                const item = library.items.get(itemKey(stage.deckId, c));
                return { text: c, sub: item?.meaning ?? "" };
              })}
            />
          </Panel>
        </>
      );
      break;
    case "words":
      body = (
        <Panel title={t.wordsTitle(intro.n)} text={t.wordsBody}>
          <ItemList
            items={stage.items.map((id) => {
              const item = library.items.get(itemKey(stage.deckId, id));
              return { text: id, reading: item?.reading, sub: item?.meaning ?? "" };
            })}
          />
        </Panel>
      );
      break;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-1 flex-col gap-4">{body}</div>
      <PrimaryButton onClick={onStart}>{strings.stage.begin}</PrimaryButton>
    </div>
  );
}

function Panel({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {text && <p className="text-muted">{text}</p>}
      {children}
    </section>
  );
}

/** Big kana with romaji under them; `top` shows the consonant + vowel split. */
function Tiles({
  tiles,
}: {
  tiles: { char: string; label: string; top?: string; strong?: boolean }[];
}) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {tiles.map((tile) => (
        <li key={tile.char}>
          {/* Tap a sound to hear it. */}
          <button
            type="button"
            onClick={() => speak(tile.char)}
            aria-label={strings.stage.listen(tile.char)}
            className={`flex w-full flex-col items-center gap-0.5 rounded-2xl border bg-surface py-3 active:opacity-70 ${
              tile.strong ? "border-accent" : "border-border"
            }`}
          >
            {tile.top && <span className="text-xs text-muted">{tile.top}</span>}
            <span lang="ja" className="font-hand text-4xl leading-tight">
              {tile.char}
            </span>
            <span className={`text-sm font-semibold ${tile.strong ? "text-accent" : ""}`}>
              {tile.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** あ → ア: the hiragana the learner knows next to its katakana. */
function Pairs({ pairs }: { pairs: [string, string][] }) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {pairs.map(([a, b]) => (
        <li key={b} lang="ja" className="flex flex-col items-center rounded-2xl border border-border bg-surface py-2 font-hand">
          <span className="text-xl text-muted">{a}</span>
          <span className="text-3xl">{b}</span>
        </li>
      ))}
    </ul>
  );
}

function ItemList({ items }: { items: { text: string; reading?: string; sub: string }[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map((i) => (
        <li key={i.text} className="flex items-center gap-4 px-4 py-2.5">
          {i.reading ? (
            <Furigana
              expression={i.text}
              reading={i.reading}
              className="font-hand inline-block min-w-16 shrink-0 text-3xl"
            />
          ) : (
            <span lang="ja" className="font-hand shrink-0 text-3xl">
              {i.text}
            </span>
          )}
          <span className="min-w-0 text-sm text-muted">{i.sub}</span>
        </li>
      ))}
    </ul>
  );
}
