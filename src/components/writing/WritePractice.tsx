"use client";

import { useState } from "react";
import { WritingCanvas } from "@/components/writing/WritingCanvas";
import { roundStroke } from "@/lib/strokes/ink";
import type { Stroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";

/** M1 demo: free writing with undo/clear; logs each normalized stroke. */
export function WritePractice() {
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
