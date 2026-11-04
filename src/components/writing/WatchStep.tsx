"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { StrokeGuide } from "@/components/writing/StrokeGuide";
import type { RefStroke } from "@/lib/strokes/types";
import { strings } from "@/lib/strings";

const STROKE_MS = 700;
const GAP_MS = 250;

/** Stroke-order animation of one or more characters, then on to tracing. */
export function WatchStep({
  strokes,
  onNext,
}: {
  /** One entry per character. */
  strokes: RefStroke[][];
  onNext: () => void;
}) {
  const [replay, setReplay] = useState(0);
  const many = strokes.length > 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-center text-sm text-muted">
        {strings.lesson.watchHint}
      </p>
      <div className="relative min-h-0 flex-1">
        <div
          className={`absolute inset-0 ${
            many
              ? "grid auto-rows-min grid-cols-2 content-center gap-3"
              : "flex items-center justify-center"
          }`}
        >
          {strokes.map((s, i) => (
            <StrokeGuide
              key={`${replay}-${i}`}
              strokes={s}
              strokeMs={STROKE_MS}
              gapMs={GAP_MS}
              className="aspect-square max-h-full w-full max-w-full rounded-2xl border border-border bg-surface text-accent"
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <SecondaryButton
          onClick={() => setReplay((r) => r + 1)}
          className="flex-1"
        >
          {strings.lesson.replay}
        </SecondaryButton>
        <div className="flex-[2]">
          <PrimaryButton onClick={onNext}>{strings.lesson.toTrace}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
