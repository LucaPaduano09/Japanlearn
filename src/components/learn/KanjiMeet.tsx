"use client";

import Link from "next/link";
import { useMemo } from "react";
import { teachableMeanings } from "@/lib/content/readings";
import { toRomaji } from "@/lib/content/romaji";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import {
  displayExpression,
  lessonReadings,
  type Reading,
  type ReadingGroup,
  type ReadingKind,
  type WordMatch,
} from "@/lib/content/wordReadings";
import { speak } from "@/lib/native/tts";
import { strings } from "@/lib/strings";

/** Per-kind styling: on'yomi blue, kun'yomi green, everywhere in the app. */
export const KIND_STYLE: Record<
  ReadingKind,
  { card: string; badge: string; text: string; mark: string }
> = {
  on: {
    card: "border-on/40 bg-on-soft",
    badge: "bg-on",
    text: "text-on",
    mark: "bg-on/15 text-on",
  },
  kun: {
    card: "border-kun/40 bg-kun-soft",
    badge: "bg-kun",
    text: "text-kun",
    mark: "bg-kun/15 text-kun",
  },
};

/**
 * The "Meaning" step: what the kanji means and how it's read. Readings are
 * split into on'yomi / kun'yomi cards, each reading shown with the N5 words
 * that use it, so the learner sees when each one applies.
 */
export function KanjiMeet({
  kanji,
  vocab,
}: {
  kanji: KanjiEntry;
  vocab: VocabEntry[];
}) {
  const [primary, ...others] = teachableMeanings(kanji);
  const readings = useMemo(() => lessonReadings(kanji, vocab), [kanji, vocab]);
  const t = strings.lesson;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5">
        <p className="font-hand text-8xl leading-none">{kanji.char}</p>
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">
            {t.meaning}
          </p>
          <p className="text-2xl font-semibold">{primary}</p>
          {others.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              {t.alsoMeans}: {others.slice(0, 4).join(", ")}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            {t.strokes(kanji.strokeCount)}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted">
        {t.readingsIntro}{" "}
        <Link href="/learn/intro/" className="font-medium text-accent">
          {t.howReadingsWork}
        </Link>
      </p>

      {(["on", "kun"] as const).map((kind) =>
        readings.main[kind].length > 0 ? (
          <ReadingCard
            key={kind}
            kind={kind}
            char={kanji.char}
            groups={readings.main[kind]}
            other={readings.other.filter((r) => r.kind === kind)}
          />
        ) : null,
      )}

      {readings.special.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="font-semibold">{t.special.title}</h3>
          <p className="text-xs text-muted">{t.special.rule}</p>
          <ul className="mt-2 divide-y divide-border">
            {readings.special.map((m) => (
              <WordRow
                key={m.word.expression + m.kana}
                match={m}
                char={kanji.char}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReadingCard({
  kind,
  char,
  groups,
  other,
}: {
  kind: ReadingKind;
  char: string;
  groups: ReadingGroup[];
  other: Reading[];
}) {
  const style = KIND_STYLE[kind];
  const t = strings.lesson.kinds[kind];
  return (
    <section className={`rounded-2xl border p-4 ${style.card}`}>
      <header className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-hand text-2xl text-white ${style.badge}`}
          aria-hidden
        >
          {t.glyph}
        </span>
        <div className="min-w-0">
          <h3 className={`font-semibold ${style.text}`}>
            {t.name} <span className="font-normal text-muted">· {t.gloss}</span>
          </h3>
          <p className="text-xs text-muted">{t.rule}</p>
        </div>
      </header>

      <ul className="mt-3 flex flex-col gap-3">
        {groups.map((g) => (
          <li
            key={g.reading.raw}
            className="rounded-xl border border-border bg-surface"
          >
            <ReadingHead reading={g.reading} char={char} kind={kind} />
            {g.words.length > 0 ? (
              <ul className="divide-y divide-border border-t border-border">
                {g.words.map((m) => (
                  <WordRow
                    key={m.word.expression + m.kana}
                    match={m}
                    char={char}
                    kind={kind}
                  />
                ))}
              </ul>
            ) : (
              <p className="border-t border-border px-3 py-2 text-xs text-muted">
                {strings.lesson.noWordsYet}
              </p>
            )}
          </li>
        ))}
      </ul>

      {other.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">
            {strings.lesson.otherReadings(other.length)}
          </summary>
          <p className="mt-1 text-xs text-muted">{strings.lesson.otherHint}</p>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {other.map((r) => (
              <span key={r.raw}>
                {readingLabel(r)}{" "}
                <span className="text-xs text-muted italic">
                  {toRomaji(r.stem + r.okurigana)}
                </span>
              </span>
            ))}
          </p>
        </details>
      )}
    </section>
  );
}

/** One reading: how it's written with the kanji, its kana, romaji, audio. */
function ReadingHead({
  reading,
  char,
  kind,
}: {
  reading: Reading;
  char: string;
  kind: ReadingKind;
}) {
  const style = KIND_STYLE[kind];
  const spoken = reading.stem + reading.okurigana;
  return (
    <button
      type="button"
      onClick={() => speak(spoken)}
      aria-label={strings.lesson.listen(readingLabel(reading))}
      className="flex w-full items-center gap-3 px-3 py-2 text-left active:opacity-70"
    >
      <span className={`text-2xl font-semibold ${style.text}`}>
        {readingLabel(reading)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm italic">{toRomaji(spoken)}</span>
        <span className="block text-xs text-muted">
          {reading.okurigana ? (
            <>
              {strings.lesson.written}{" "}
              <span className="text-base text-foreground">
                {char}
                <span className="text-muted">{reading.okurigana}</span>
              </span>
            </>
          ) : reading.suffixOnly ? (
            strings.lesson.suffixHint
          ) : reading.prefixOnly ? (
            strings.lesson.prefixHint
          ) : null}
        </span>
      </span>
      <SpeakerIcon />
    </button>
  );
}

/** A word using the kanji, with the kanji and its sound highlighted. */
export function WordRow({
  match,
  char,
  kind,
}: {
  match: WordMatch;
  char: string;
  kind?: ReadingKind;
}) {
  const mark = kind ? KIND_STYLE[kind].mark : "";
  const expression = displayExpression(match.word);
  const at = expression.indexOf(char);
  const { kana, span } = match;
  return (
    <li>
      <button
        type="button"
        onClick={() => speak(kana)}
        aria-label={strings.lesson.listen(kana)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left active:opacity-70"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl">
              {kind && at >= 0 ? (
                <>
                  {expression.slice(0, at)}
                  <mark className={`rounded px-0.5 ${mark}`}>{char}</mark>
                  {expression.slice(at + 1)}
                </>
              ) : (
                expression
              )}
            </span>
            <span className="text-sm whitespace-nowrap text-muted">
              {kind && span ? (
                <>
                  {kana.slice(0, span[0])}
                  <mark className={`rounded px-0.5 font-semibold ${mark}`}>
                    {kana.slice(span[0], span[1])}
                  </mark>
                  {kana.slice(span[1])}
                </>
              ) : (
                kana
              )}{" "}
              · <span className="italic">{toRomaji(kana)}</span>
            </span>
          </span>
          <span className="block text-sm">{match.word.meaning}</span>
        </span>
        <SpeakerIcon />
      </button>
    </li>
  );
}

/** Kana for a reading as learners see it: affix dashes, okurigana after a dot. */
function readingLabel(r: Reading): string {
  return r.raw.split(".")[0];
}

export function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-accent"
      aria-hidden
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
