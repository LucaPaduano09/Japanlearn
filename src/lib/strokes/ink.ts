import { getStroke } from "perfect-freehand";
import type { Stroke, StrokePoint } from "./types";

/** Ink width as a fraction of the box side. */
export const INK_SIZE = 0.045;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Maps a client-space pointer position to the 0..1 box. Values just outside
 * the box are kept (not clamped) so a stroke that overshoots keeps its shape.
 */
export function normalizePoint(
  clientX: number,
  clientY: number,
  box: Box,
  t: number,
  pressure?: number,
): StrokePoint {
  const point: StrokePoint = {
    x: (clientX - box.left) / box.width,
    y: (clientY - box.top) / box.height,
    t,
  };
  if (pressure !== undefined) point.p = pressure;
  return point;
}

/** Whether a PointerEvent's pressure is a real reading (pens only). */
export function hasRealPressure(pointerType: string, pressure: number) {
  return pointerType === "pen" && pressure > 0;
}

/**
 * Outline polygon of a stroke in pixel space, for a box `side` px wide.
 * `complete` is false while the finger is still down.
 */
export function inkOutline(stroke: Stroke, side: number, complete: boolean) {
  const usesPressure = stroke.some((pt) => pt.p !== undefined);
  return getStroke(
    stroke.map((pt) => [pt.x * side, pt.y * side, pt.p ?? 0.5]),
    {
      size: INK_SIZE * side,
      thinning: usesPressure ? 0.6 : 0.5,
      smoothing: 0.5,
      streamline: 0.4,
      simulatePressure: !usesPressure,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
      last: complete,
    },
  );
}

/** Turns an outline polygon into an SVG path (quadratic midpoints). */
export function outlineToPath(outline: number[][]): string {
  if (outline.length < 2) return "";
  const [first] = outline;
  let d = `M${fmt(first[0])},${fmt(first[1])}Q`;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += `${fmt(x0)},${fmt(y0)} ${fmt((x0 + x1) / 2)},${fmt((y0 + y1) / 2)} `;
  }
  return d.trimEnd() + "Z";
}

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

/** Compact copy of a stroke for logging / fixtures. */
export function roundStroke(stroke: Stroke, digits = 3): Stroke {
  const k = 10 ** digits;
  return stroke.map((pt) => {
    const out: StrokePoint = {
      x: Math.round(pt.x * k) / k,
      y: Math.round(pt.y * k) / k,
      t: Math.round(pt.t),
    };
    if (pt.p !== undefined) out.p = Math.round(pt.p * 100) / 100;
    return out;
  });
}
