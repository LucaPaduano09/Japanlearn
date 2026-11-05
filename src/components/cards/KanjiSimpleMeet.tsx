"use client";

import { useMemo, useState } from "react";
import { SpeakerIcon } from "@/components/cards/ListenCard";
import { Furigana } from "@/components/ui/Furigana";
import { KanjiMeet } from "@/components/learn/KanjiMeet";
import { teachableMeanings } from "@/lib/content/readings";
import type { KanjiEntry, VocabEntry } from "@/lib/content/types";
import { displayExpression } from "@/lib/content/wordReadings";
import { speak } from "@/lib/native/tts";
import { strings } from "@/lib/strings";

/**
 * Meeting a kanji for the first time: the character, what it means and one
 * word that uses it. Readings (on/kun) wait behind "How is it read?".
 */
export function KanjiSimpleMeet({
  kanji,
  vocab,
  returnTo,
}: {
  kanji: KanjiEntry;
  vocab: VocabEntry[];
  /** Page to come back to from "How readings work". */
  returnTo: string;
}) {
  const [open, setOpen] = useState(false);
  const t = strings.newItem;
  const meaning = teachableMeanings(kanji).slice(0, 2).join(", ");

  // The shortest word with this kanji that isn't the kanji alone.
  const example = useMemo(
    () =>
      vocab
        .map((w) => ({ w, written: displayExpression(w).replace(/～/g, "") }))
        .filter(({ written }) => written.includes(kanji.char) && written !== kanji.char)
        .sort((a, b) => a.written.length - b.written.length)[0],
    [vocab, kanji.char],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <p lang="ja" className="font-hand text-[9rem] leading-none">
          {kanji.char}
        </p>
        <p className="text-3xl font-semibold">{meaning}</p>
      </div>

      {example && (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
          <button
            type="button"
            onClick={() => speak(example.w.reading.split(";")[0])}
            aria-label={strings.lesson.listen(example.w.reading)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent active:opacity-70"
          >
            <SpeakerIcon />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t.example}</p>
            <Furigana
              expression={example.written}
              reading={example.w.reading}
              highlight={{ index: example.written.indexOf(kanji.char), span: null, className: "text-accent" }}
              className="font-hand block text-2xl"
            />
            <p className="text-sm text-muted">{example.w.meaning}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-12 w-full items-center justify-between px-4 font-medium"
        >
          {t.howRead}
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p className="text-sm text-muted">{t.readLater}</p>
            <KanjiMeet
              kanji={kanji}
              vocab={vocab}
              showHeader={false}
              introHref={`/learn/intro/?from=${encodeURIComponent(returnTo)}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
