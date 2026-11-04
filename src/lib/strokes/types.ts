/** One sampled pointer position, normalized to the 0..1 writing box. */
export interface StrokePoint {
  x: number;
  y: number;
  /** Milliseconds since the stroke started. */
  t: number;
  /** Pen pressure 0..1, only when the device reports real pressure. */
  p?: number;
}

/** A single pen-down → pen-up stroke. */
export type Stroke = StrokePoint[];

/** A reference stroke from KanjiVG: [x, y] pairs in the 0..1 box. */
export type RefStroke = [number, number][];
