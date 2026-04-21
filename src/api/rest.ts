import type { TickerSymbol } from "@/ticker/tickers";
import type { ChartPrice, TimeFrame } from "./types";
import { PriceApiError } from "./errors";

// Interval + point count per timeframe. Shared with the WS subscription
// layer so the backfill granularity matches the stream we listen on.
export const CHART_PARAMS: Record<
  TimeFrame,
  { interval: string; limit: number }
> = {
  DAY: { interval: "5m", limit: 288 }, // 24h
  WEEK: { interval: "1h", limit: 168 }, // 7d
  MONTH: { interval: "4h", limit: 180 }, // 30d
  YEAR: { interval: "1d", limit: 365 }, // 1y
  ALL: { interval: "1w", limit: 1000 }, // capped by Binance; returns what's available
};

export const INTERVAL_TO_TIMEFRAME: Record<string, TimeFrame> =
  Object.fromEntries(
    (Object.entries(CHART_PARAMS) as [TimeFrame, { interval: string }][]).map(
      ([tf, { interval }]) => [interval, tf],
    ),
  );

const REST_BASE = "https://api.binance.com";
const REQUEST_TIMEOUT_MS = 15_000;

type BinanceKline = [
  openTime: number,
  open: string,
  high: string,
  low: string,
  close: string,
  ...rest: unknown[],
];

/**
 * One-shot historical klines fetch. WebSocket streams only push live
 * updates, so chart history is seeded via REST once per (symbol,
 * timeFrame) combination and then amended by the kline stream.
 */
export async function fetchKlines(
  symbol: TickerSymbol,
  timeFrame: TimeFrame,
  signal?: AbortSignal,
): Promise<ChartPrice[]> {
  const { interval, limit } = CHART_PARAMS[timeFrame];
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(limit),
  });
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${REST_BASE}/api/v3/klines?${params}`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  });
  if (!response.ok) {
    throw new PriceApiError(
      `Binance API returned ${response.status}`,
      response.status,
    );
  }
  const klines = (await response.json()) as BinanceKline[];
  // Binance returns klines oldest-first; newest-first downstream.
  const points: ChartPrice[] = new Array(klines.length);
  for (let i = 0; i < klines.length; i++) {
    const [openTime, , , , close] = klines[klines.length - 1 - i];
    points[i] = { datetime: new Date(openTime).toISOString(), rate: close };
  }
  return points;
}
