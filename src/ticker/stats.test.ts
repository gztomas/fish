import { describe, expect, it } from "vitest";
import { computeChartStats } from "./stats";
import type { ChartPrice } from "@/api/types";

function point(seconds: number, rate: number): ChartPrice {
  return {
    datetime: new Date(seconds * 1000).toISOString(),
    rate: String(rate),
  };
}

describe("computeChartStats", () => {
  it("returns null for empty input", () => {
    expect(computeChartStats([])).toBeNull();
  });

  it("finds high, low, first, last, and change", () => {
    // Newest-first, matching the order produced by api/queries.ts.
    const stats = computeChartStats([
      point(4, 110),
      point(3, 90),
      point(2, 120),
      point(1, 100),
    ])!;
    expect(stats.high).toBe(120);
    expect(stats.low).toBe(90);
    expect(stats.first).toBe(100);
    expect(stats.last).toBe(110);
    expect(stats.change).toBe(10);
    expect(stats.changeRatio).toBeCloseTo(0.1);
    expect(stats.highPoint.datetime).toBe(new Date(2000).toISOString());
    expect(stats.lowPoint.datetime).toBe(new Date(3000).toISOString());
  });

  it("handles a flat series without dividing by zero", () => {
    const stats = computeChartStats([point(1, 50), point(2, 50)])!;
    expect(stats.change).toBe(0);
    expect(stats.changeRatio).toBe(0);
  });
});
