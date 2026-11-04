import { describe, expect, it } from "vitest";
import { strings } from "./strings";

describe("strings", () => {
  it("formats the due count", () => {
    expect(strings.home.due(3)).toBe("3 due");
  });
});
