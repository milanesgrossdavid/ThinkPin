import { describe, expect, it } from "vitest";
import { calculateReadingTimeMinutes } from "../../src/lib/ingestion/reading-time";

describe("calculateReadingTimeMinutes", () => {
  it("returns zero for content without words", () => {
    expect(calculateReadingTimeMinutes(0)).toBe(0);
  });

  it("rounds up at 200 words per minute", () => {
    expect(calculateReadingTimeMinutes(200)).toBe(1);
    expect(calculateReadingTimeMinutes(201)).toBe(2);
  });

  it("rejects invalid word counts", () => {
    expect(() => calculateReadingTimeMinutes(-1)).toThrow(TypeError);
    expect(() => calculateReadingTimeMinutes(1.5)).toThrow(TypeError);
  });
});
