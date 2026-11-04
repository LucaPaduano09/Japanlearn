"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StrokeGuide } from "@/components/writing/StrokeGuide";
import { loadKana, loadKanjiN5, loadStrokes } from "@/lib/content/loader";
import type { KanaEntry, KanjiEntry } from "@/lib/content/types";
import type { RefStroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";

interface CharData {
  char: string;
  kanji: KanjiEntry | null;
  kana: KanaEntry | null;
  strokes: RefStroke[] | null;
}

export function KanjiDetail() {
  const char = useSearchParams().get("c");
  const [data, setData] = useState<CharData | null>(null);

  useEffect(() => {
    if (!char) return;
    let cancelled = false;
    Promise.all([loadKanjiN5(), loadKana(), loadStrokes(char)]).then(
      ([kanjiList, kanaList, strokeData]) => {
        if (cancelled) return;
        setData({
          char,
          kanji: kanjiList.find((k) => k.char === char) ?? null,
          kana: kanaList.find((k) => k.char === char) ?? null,
          strokes: strokeData?.strokes ?? null,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [char]);

  if (!char) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-8">
        <p className="text-muted">{strings.kanji.noChar}</p>
      </div>
    );
  }
  if (data?.char !== char) return null;

  const { kanji, kana, strokes } = data;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-baseline gap-3">
        <h1 className="font-hand text-5xl">{char}</h1>
        {kanji && (
          <span className="text-sm text-muted">
            {strings.kanji.strokes(kanji.strokeCount)}
            {kanji.grade !== null && ` · ${strings.kanji.grade(kanji.grade)}`}
          </span>
        )}
      </header>

      {strokes ? (
        <StrokeGuide
          strokes={strokes}
          className="mx-auto h-56 w-56 rounded-2xl border border-border bg-surface text-accent"
        />
      ) : (
        <p className="text-muted">{strings.kanji.notFound(char)}</p>
      )}

      {kanji && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-muted">{strings.kanji.onYomi}</dt>
          <dd>{kanji.onYomi.join("、") || "—"}</dd>
          <dt className="text-muted">{strings.kanji.kunYomi}</dt>
          <dd>{kanji.kunYomi.join("、") || "—"}</dd>
          <dt className="text-muted">{strings.kanji.meanings}</dt>
          <dd>{kanji.meanings.join(", ")}</dd>
        </dl>
      )}

      {!kanji && kana && (
        <p className="text-sm">
          <span className="text-muted">{strings.kanji.romaji}: </span>
          {kana.romaji}
        </p>
      )}
    </div>
  );
}
