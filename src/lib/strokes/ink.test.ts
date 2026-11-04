import { describe, expect, it } from "vitest";
import {
  hasRealPressure,
  inkOutline,
  normalizePoint,
  outlineToPath,
  roundStroke,
} from "./ink";

const box = { left: 100, top: 50, width: 200, height: 200 };

describe("normalizePoint", () => {
  it("maps the box corners to 0 and 1", () => {
    expect(normalizePoint(100, 50, box, 0)).toEqual({ x: 0, y: 0, t: 0 });
    expect(normalizePoint(300, 250, box, 5)).toEqual({ x: 1, y: 1, t: 5 });
  });

  it("does not clamp points outside the box", () => {
    const pt = normalizePoint(320, 40, box, 0);
    expect(pt.x).toBeCloseTo(1.1);
    expect(pt.y).toBeCloseTo(-0.05);
  });

  it("only stores pressure when given", () => {
    expect(normalizePoint(200, 150, box, 0)).not.toHaveProperty("p");
    expect(normalizePoint(200, 150, box, 0, 0.7).p).toBe(0.7);
  });
});

describe("hasRealPressure", () => {
  it("trusts pens only", () => {
    expect(hasRealPressure("pen", 0.4)).toBe(true);
    expect(hasRealPressure("pen", 0)).toBe(false);
    expect(hasRealPressure("touch", 1)).toBe(false);
    expect(hasRealPressure("mouse", 0.5)).toBe(false);
  });
});

describe("inkOutline / outlineToPath", () => {
  const line = [
    { x: 0.2, y: 0.5, t: 0 },
    { x: 0.5, y: 0.5, t: 16 },
    { x: 0.8, y: 0.5, t: 32 },
  ];

  it("produces a closed path around the stroke", () => {
    const outline = inkOutline(line, 300, true);
    expect(outline.length).toBeGreaterThan(4);
    const xs = outline.map(([x]) => x);
    expect(Math.min(...xs)).toBeLessThan(0.2 * 300);
    expect(Math.max(...xs)).toBeGreaterThan(0.8 * 300);
    const d = outlineToPath(outline);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });

  it("returns an empty path for degenerate outlines", () => {
    expect(outlineToPath([])).toBe("");
  });
});

describe("roundStroke", () => {
  it("rounds coordinates and time", () => {
    expect(
      roundStroke([{ x: 0.12345, y: 0.98765, t: 16.6, p: 0.333 }]),
    ).toEqual([{ x: 0.123, y: 0.988, t: 17, p: 0.33 }]);
  });
});
