"use client";

import { useEffect, useState } from "react";
import type { RefStroke } from "@/lib/strokes/types";

interface StrokeGuideProps {
  strokes: RefStroke[];
  /** How long each stroke takes to draw. */
  strokeMs?: number;
  /** Pause between strokes. */
  gapMs?: number;
  /** Replay from the top once every stroke has drawn. */
  loop?: boolean;
  showNumbers?: boolean;
  className?: string;
}

/**
 * Animates KanjiVG reference strokes one by one (SVG stroke-dasharray /
 * stroke-dashoffset), with stroke numbers. Used on the kanji detail page and
 * as a write-practice hint.
 */
export function StrokeGuide({
  strokes,
  strokeMs = 500,
  gapMs = 200,
  loop = true,
  showNumbers = true,
  className = "",
}: StrokeGuideProps) {
  // Bumped whenever `strokes` changes or a loop restarts; used as the <svg>
  // key so the CSS animations always replay from the start.
  const [token, setToken] = useState(0);
  const [shown, setShown] = useState(strokes);
  if (shown !== strokes) {
    setShown(strokes);
    setToken((t) => t + 1);
  }

  useEffect(() => {
    if (!loop || strokes.length === 0) return;
    const total = strokes.length * (strokeMs + gapMs) + gapMs;
    const id = setInterval(() => setToken((t) => t + 1), total);
    return () => clearInterval(id);
  }, [loop, strokes, strokeMs, gapMs]);

  return (
    <svg key={token} viewBox="0 0 100 100" className={className} aria-hidden>
      {strokes.map((stroke, i) => (
        <path
          key={i}
          d={strokeToPath(stroke)}
          pathLength={100}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 100,
            animation: `stroke-draw ${strokeMs}ms ease-out forwards`,
            animationDelay: `${i * (strokeMs + gapMs)}ms`,
          }}
        />
      ))}
      {showNumbers &&
        strokes.map((stroke, i) => (
          <text
            key={`n${i}`}
            x={stroke[0][0] * 100 - 4}
            y={stroke[0][1] * 100 - 2}
            fontSize={6}
            fill="currentColor"
            opacity={0.5}
          >
            {i + 1}
          </text>
        ))}
    </svg>
  );
}

/** Polyline SVG path for a reference stroke, in a 0..100 viewBox. */
export function strokeToPath(stroke: RefStroke): string {
  return stroke
    .map(
      ([x, y], i) =>
        `${i === 0 ? "M" : "L"}${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`,
    )
    .join(" ");
}
