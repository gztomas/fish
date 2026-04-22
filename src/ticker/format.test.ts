import { describe, expect, it } from "vitest";
import { formatPercentChange, formatUsd } from "./format";

describe("formatUsd", () => {
  it("formats whole dollar amounts with two decimals", () => {
    expect(formatUsd(71115.71)).toBe("$71,115.71");
  });
});

describe("formatPercentChange", () => {
  it("shows a leading sign for positive and negative ratios", () => {
    expect(formatPercentChange(0.0512)).toBe("+5.12%");
    expect(formatPercentChange(-0.025)).toBe("-2.50%");
  });
});
