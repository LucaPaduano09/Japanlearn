import { describe, expect, it } from "vitest";
import { pathLength, resample } from "./resample";

describe("resample", () => {
  it("spaces points evenly by arc length", () => {
    // Uneven input: one long segment then many tiny ones.
    const line: [number, number][] = [
      [0, 0],
      [0.9, 0],
      [0.95, 0],
      [1, 0],
    ];
    const out = resample(line, 5);
    expect(out).toHaveLength(5);
    out.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(i * 0.25);
      expect(y).toBe(0);
    });
  });

  it("follows corners", () => {
    const corner: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const out = resample(corner, 3);
    expect(out[1][0]).toBeCloseTo(1);
    expect(out[1][1]).toBeCloseTo(0);
    expect(out[2]).toEqual([1, 1]);
  });

  it("repeats a single point (taps, dots)", () => {
    expect(resample([[0.5, 0.5]], 4)).toEqual(Array(4).fill([0.5, 0.5]));
  });

  it("measures path length", () => {
    expect(
      pathLength([
        [0, 0],
        [3, 4],
      ]),
    ).toBe(5);
  });
});
