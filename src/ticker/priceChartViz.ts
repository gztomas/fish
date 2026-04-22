import { formatPrefix, precisionPrefix } from "d3-format";
import type { TimeFrame } from "@/api/types";
import { formatUsd, getPriceDecimals } from "./format";

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
  timeFrame: TimeFrame,
  name: string,
): string {
  return `${name} price chart, ${TIME_FRAME_LABEL[timeFrame]}`;
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
