import type { RefStroke, Stroke } from "./types";

type Pt = [number, number];

/** Plain [x, y] pairs from a captured stroke. */
export function toPairs(stroke: Stroke): Pt[] {
  return stroke.map((p) => [p.x, p.y]);
}

/** Total polyline length. */
export function pathLength(points: Pt[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  return len;
}

/**
 * Resamples a polyline to `n` points evenly spaced by arc length, so strokes
 * drawn at different speeds (or sampled differently) line up point-to-point.
 */
export function resample(points: Pt[] | RefStroke, n: number): Pt[] {
  if (points.length === 0) return [];
  const total = pathLength(points);
  if (points.length === 1 || total === 0) {
    return Array.from({ length: n }, () => [points[0][0], points[0][1]]);
  }
  const step = total / (n - 1);
  const out: Pt[] = [[points[0][0], points[0][1]]];
  let prev: Pt = [points[0][0], points[0][1]];
  let carried = 0; // distance walked since the last emitted point
  for (let i = 1; i < points.length && out.length < n; i++) {
    const next: Pt = [points[i][0], points[i][1]];
    let seg = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
    while (carried + seg >= step && out.length < n) {
      const t = (step - carried) / seg;
      const pt: Pt = [
        prev[0] + (next[0] - prev[0]) * t,
        prev[1] + (next[1] - prev[1]) * t,
      ];
      out.push(pt);
      prev = pt;
      seg = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
      carried = 0;
    }
    carried += seg;
    prev = next;
  }
  const last = points[points.length - 1];
  while (out.length < n) out.push([last[0], last[1]]); // float rounding at the end
  return out;
}
