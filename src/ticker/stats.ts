import { greatest, least } from "d3-array";

import type { ChartPrice } from "@/api/types";

export type ChartStats = {
  high: number;
  low: number;
  first: number;
  last: number;
  change: number;
  changeRatio: number;
  highPoint: ChartPrice;
  lowPoint: ChartPrice;
};

const rateOf = (point: ChartPrice) => Number(point.rate);

/**
 * Expects `points` in newest → oldest order (the shape produced by
 * `src/api/queries.ts`). Parses the string `rate` values on the fly;
 * this is cheap and keeps the normalized API shape as the single source
 * of truth.
 */
export function computeChartStats(points: ChartPrice[]): ChartStats | null {
  if (points.length === 0) return null;

  const highPoint = greatest(points, rateOf)!;
  const lowPoint = least(points, rateOf)!;
  const high = rateOf(highPoint);
  const low = rateOf(lowPoint);
  const first = rateOf(points[points.length - 1]);
  const last = rateOf(points[0]);
  const change = last - first;
  const changeRatio = first === 0 ? 0 : change / first;

  return {
    high,
    low,
    first,
    last,
    change,
    changeRatio,
    highPoint,
    lowPoint,
  };
}
