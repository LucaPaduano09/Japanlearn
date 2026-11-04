import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { charToCodepointHex } from "./codepoint";
import { gradeCharacter, gradeStroke } from "./compare";
import { addStroke, isComplete, startSession } from "./session";
import type { RefStroke, Stroke } from "./types";

/** Reference strokes from the generated KanjiVG data. */
function refsFor(char: string): RefStroke[] {
  const file = path.join(
    process.cwd(),
    "public/data/strokes",
    `${charToCodepointHex(char)}.json`,
  );
  return JSON.parse(readFileSync(file, "utf8")).strokes;
}

/** A plausible hand-drawn copy: offset, plus a deterministic wobble. */
function drawn(ref: RefStroke, { dx = 0, dy = 0, wobble = 0.01 } = {}): Stroke {
  return ref.map(([x, y], i) => ({
    x: x + dx + Math.sin(i * 1.7) * wobble,
    y: y + dy + Math.cos(i * 2.3) * wobble,
    t: i * 16,
  }));
}

const reversed = (ref: RefStroke): RefStroke => [...ref].reverse();
const mirrored = (ref: RefStroke): RefStroke => ref.map(([x, y]) => [1 - x, y]);

describe.each(["あ", "日", "書"])("gradeStroke on %s", (char) => {
  const refs = refsFor(char);

  it("accepts every stroke drawn in place, in order", () => {
    refs.forEach((ref, i) => {
      expect(gradeStroke(drawn(ref), refs, i).verdict).toBe("ok");
    });
  });

  it("calls a noticeably offset stroke sloppy", () => {
    expect(gradeStroke(drawn(refs[0], { dx: 0.1 }), refs, 0).verdict).toBe(
      "sloppy",
    );
  });

  it("rejects a stroke far from its place", () => {
    expect(
      gradeStroke(drawn(refs[0], { dx: 0.3, dy: 0.3 }), refs, 0).verdict,
    ).toBe("miss");
  });

  it("flags a stroke drawn backwards", () => {
    expect(gradeStroke(drawn(reversed(refs[0])), refs, 0).verdict).toBe(
      "wrong-direction",
    );
  });
});

describe("special cases", () => {
  it("rejects mirrored strokes (あ's curl)", () => {
    const refs = refsFor("あ");
    expect(gradeStroke(drawn(mirrored(refs[2])), refs, 2).verdict).toBe("miss");
  });

  it("detects out-of-order strokes (日: bottom line before the middle one)", () => {
    const refs = refsFor("日");
    expect(gradeStroke(drawn(refs[3]), refs, 2)).toMatchObject({
      verdict: "wrong-order",
      matchedIndex: 3,
    });
  });

  it("detects out-of-order strokes (書: a horizontal before the vertical)", () => {
    const refs = refsFor("書");
    const verticalIndex = refs.findIndex(
      (r) =>
        Math.abs(r[0][0] - r.at(-1)![0]) < 0.05 && r.at(-1)![1] - r[0][1] > 0.4,
    );
    expect(verticalIndex).toBeGreaterThan(0);
    const result = gradeStroke(
      drawn(refs[verticalIndex]),
      refs,
      verticalIndex - 1,
    );
    expect(result.verdict).toBe("wrong-order");
  });

  it("strict is stricter than relaxed", () => {
    const refs = refsFor("日");
    const stroke = drawn(refs[0], { dx: 0.08 });
    expect(gradeStroke(stroke, refs, 0, "relaxed").verdict).toBe("ok");
    expect(gradeStroke(stroke, refs, 0, "strict").verdict).toBe("sloppy");
  });
});

describe("gradeCharacter", () => {
  const clean = { sloppy: 0, misses: 0, hints: 0, showedAnswer: false };
  it("maps tallies to FSRS ratings", () => {
    expect(gradeCharacter(clean)).toBe("easy");
    expect(gradeCharacter({ ...clean, sloppy: 2 })).toBe("good");
    expect(gradeCharacter({ ...clean, misses: 1 })).toBe("hard");
    expect(gradeCharacter({ ...clean, misses: 1, hints: 1 })).toBe("hard");
    expect(gradeCharacter({ ...clean, misses: 3 })).toBe("again");
    expect(gradeCharacter({ ...clean, showedAnswer: true })).toBe("again");
  });
});

describe("writing session", () => {
  it("keeps accepted strokes, rejects misses, and completes", () => {
    const refs = refsFor("日");
    let s = startSession(refs);
    s = addStroke(s, drawn(refs[0]));
    s = addStroke(s, drawn(refs[3])); // out of order → rejected
    expect(s.accepted).toHaveLength(1);
    expect(s.last?.verdict).toBe("wrong-order");
    for (const ref of refs.slice(1)) s = addStroke(s, drawn(ref));
    expect(isComplete(s)).toBe(true);
    expect(s.tally.misses).toBe(1);
    expect(gradeCharacter(s.tally)).toBe("hard");
  });
});
