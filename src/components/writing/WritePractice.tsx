"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CharPractice } from "@/components/writing/CharPractice";
import { WritingCanvas } from "@/components/writing/WritingCanvas";
import { roundStroke } from "@/lib/strokes/ink";
import type { Stroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";

/** /write/?c=あ practices one character; without ?c it's a free canvas. */
export function WritePractice() {
  const char = useSearchParams().get("c");
  if (char) return <CharPractice key={char} char={char} />;
  return <FreeCanvas />;
}

/** Free writing with undo/clear; logs each normalized stroke (for tuning). */
function FreeCanvas() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const onStroke = (stroke: Stroke) => {
    console.log(`stroke ${strokes.length + 1}`, roundStroke(stroke));
    setStrokes((prev) => [...prev, stroke]);
  };

  const last = strokes.at(-1);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{strings.write.title}</h1>
        <p className="text-sm text-muted">
          {strings.write.strokeCount(strokes.length)}
        </p>
      </header>

      <div className="relative min-h-0 flex-1">
        <WritingCanvas
          strokes={strokes}
          onStroke={onStroke}
          className="absolute inset-0"
        />
      </div>

      <PickChar />

      <p className="h-5 text-center font-mono text-xs text-muted">
        {last &&
          strings.write.lastStroke(
            last.length,
            Math.round(last.at(-1)!.t),
            last[0].p !== undefined,
          )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setStrokes((prev) => prev.slice(0, -1))}
          disabled={strokes.length === 0}
          className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70 disabled:opacity-40"
        >
          {strings.write.undo}
        </button>
        <button
          type="button"
          onClick={() => setStrokes([])}
          disabled={strokes.length === 0}
          className="rounded-2xl border border-border bg-surface py-3 font-medium active:opacity-70 disabled:opacity-40"
        >
          {strings.write.clear}
        </button>
      </div>
    </div>
  );
}

/** Jump to practicing a specific character. */
function PickChar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const char = [...value.trim()][0];
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (char) router.push(`/write/?c=${encodeURIComponent(char)}`);
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={strings.write.pickPlaceholder}
        aria-label={strings.write.pickLabel}
        lang="ja"
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2"
      />
      <button
        type="submit"
        disabled={!char}
        className="rounded-xl bg-accent px-4 font-medium text-white disabled:opacity-40"
      >
        {strings.write.practice}
      </button>
    </form>
  );
}
