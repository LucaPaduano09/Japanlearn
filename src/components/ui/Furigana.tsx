"use client";

import { useEffect, useMemo, useState } from "react";
import { furigana, type Pin } from "@/lib/content/furigana";
import { loadAllKanji } from "@/lib/content/loader";
import type { KanjiEntry } from "@/lib/content/types";

/** Kept once loaded, so later mounts split words on their first render. */
let kanjiMap: Map<string, KanjiEntry> | null = null;

function useKanjiMap() {
  const [map, setMap] = useState(kanjiMap);
  useEffect(() => {
    if (map) return;
    loadAllKanji().then((list) => {
      kanjiMap ??= new Map(list.map((k) => [k.char, k]));
      setMap(kanjiMap);
    });
  }, [map]);
  return map;
}

/**
 * A word with its reading in small kana above each kanji, like in Japanese
 * books for learners. `highlight` colors one kanji and its own reading.
 */
export function Furigana({
  expression,
  reading,
  highlight,
  className = "",
}: {
  expression: string;
  reading: string;
  /** Index of the kanji in `expression`, its reading span (from matchWord) and the color. */
  highlight?: { index: number; span: [number, number] | null; className: string };
  className?: string;
}) {
  const map = useKanjiMap();
  const pinIndex = highlight?.index;
  const pinSpan = highlight?.span;
  const segments = useMemo(() => {
    const pin: Pin | undefined =
      pinIndex !== undefined && pinSpan ? { index: pinIndex, span: pinSpan } : undefined;
    return furigana(expression, reading, (c) => map?.get(c), pin);
  }, [expression, reading, pinIndex, pinSpan, map]);

  return (
    <span lang="ja" className={`[&_rt]:text-[0.5em] ${className}`}>
      {segments.map((s) => {
        const marked = highlight && s.ruby && s.index === highlight.index && [...s.text].length === 1;
        const mark = marked ? `rounded ${highlight.className}` : undefined;
        return s.ruby ? (
          <ruby key={s.index} className={mark}>
            {s.text}
            <rt className={marked ? "font-semibold" : "text-muted"}>{s.ruby}</rt>
          </ruby>
        ) : (
          <span key={s.index}>{s.text}</span>
        );
      })}
    </span>
  );
}
