import { formatPrefix, precisionPrefix } from "d3-format";
import { scaleLinear, scaleTime } from "d3-scale";
import type { TimeFrame } from "@/api/types";
import { formatPercentChange, formatUsd, getPriceDecimals } from "./format";
import type { ChartStats } from "./stats";

export type ChartDatum = {
  timestamp: number;
  rate: number;
};

export type ChartMouseState = {
  isTooltipActive?: boolean;
  activeTooltipIndex?: number | string | null;
  activeLabel?: string | number;
};

const TIME_FRAME_LABEL: Record<TimeFrame, string> = {
  DAY: "past day",
  WEEK: "past week",
  MONTH: "past month",
  YEAR: "past year",
  ALL: "all time",
};

export const Y_TICK_COUNT = 5;
export const X_TICK_COUNT: Record<TimeFrame, number> = {
  DAY: 6,
  WEEK: 7,
  MONTH: 8,
  YEAR: 12,
  ALL: 10,
};

export function buildChartAriaLabel(
  stats: ChartStats | null,
  timeFrame: TimeFrame,
  name: string,
): string {
  const period = TIME_FRAME_LABEL[timeFrame];
  if (!stats) return `${name} price chart, ${period}`;
  const decimals = getPriceDecimals(stats.low);
  return (
    `${name} price chart, ${period}. ` +
    `Range ${formatUsd(stats.low, decimals)} to ${formatUsd(stats.high, decimals)}. ` +
    `Change ${formatPercentChange(stats.changeRatio)}.`
  );
}

export function buildNiceYAxis(stats: ChartStats | null): {
  yDomain: [number, number];
  yTicks: number[];
  yStep: number;
} {
  if (!stats) return { yDomain: [0, 0], yTicks: [], yStep: 1 };
  // Tight domain so the plot fills the card; ticks come from a
  // separate niced scale so the labels still land on round numbers.
  const [low, high] = [stats.low, stats.high];
  const tickScale = scaleLinear().domain([low, high]).nice(Y_TICK_COUNT);
  const rawTicks = tickScale.ticks(Y_TICK_COUNT);
  const step =
    rawTicks.length >= 2 ? rawTicks[1] - rawTicks[0] : high - low || 1;
  const yTicks = rawTicks.filter((t) => t > low && t < high);
  return { yDomain: [low, high], yTicks, yStep: step };
}

// Compact "$71k" / "$71.2k" axis labels: precision adapts to the tick
// step, and every label shares the same SI prefix so they line up.
// For sub-dollar prices the SI-prefix trick picks "m" (milli) which
// reads as milliseconds, so fall back to a plain fixed-decimal format.
export function buildCompactUsdFormatter(
  step: number,
  reference: number,
): (value: number) => string {
  if (Math.abs(reference) < 1) {
    const decimals = getPriceDecimals(reference);
    return (value) => formatUsd(value, decimals);
  }
  const precision = Math.min(1, precisionPrefix(step, reference));
  const format = formatPrefix(`.${precision}~s`, reference);
  return (value) => `$${format(value)}`;
}

export function buildXTicks(timestamps: number[], count: number): number[] {
  if (timestamps.length < 2) return [];
  const min = timestamps[0];
  const max = timestamps[timestamps.length - 1];
  return scaleTime()
    .domain([min, max])
    .ticks(count)
    .map((d) => d.valueOf())
    .filter((t) => t > min && t < max);
}

export function pointFromState(
  state: ChartMouseState | undefined,
  data: ChartDatum[],
): ChartDatum | null {
  if (!state?.isTooltipActive) return null;
  const idx = state.activeTooltipIndex;
  if (typeof idx === "number" && idx >= 0 && idx < data.length) {
    return data[idx];
  }
  const label = state.activeLabel;
  if (typeof label === "number") {
    return data.find((d) => d.timestamp === label) ?? null;
  }
  return null;
}
