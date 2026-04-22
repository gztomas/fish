import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@/api/client";
import type { ChartPrice, Price, TimeFrame } from "./types";

// Binance kline is a 12-element tuple; we only need openTime (index 0)
// and close price (index 4). See
// https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
type BinanceKline = [
  openTime: number,
  open: string,
  high: string,
  low: string,
  close: string,
  ...rest: unknown[],
];

type BinancePriceTicker = { symbol: string; price: string };

// Interval + point count per timeframe. Open time of the freshest bar
// is in the past, so the 5s live tick stays newer and
// `computeLiveChartStats` keeps prepending it.
const CHART_PARAMS: Record<TimeFrame, { interval: string; limit: number }> = {
  DAY: { interval: "5m", limit: 288 }, // 24h
  WEEK: { interval: "1h", limit: 168 }, // 7d
  MONTH: { interval: "4h", limit: 180 }, // 30d
  YEAR: { interval: "1d", limit: 365 }, // 1y
  ALL: { interval: "1w", limit: 1000 }, // capped by Binance; returns what's available
};

export const currentPrice = {
  queryOptions: (symbol: string) =>
    queryOptions({
      queryKey: ["CurrentPrice", { symbol }] as const,
      queryFn: async ({ signal }): Promise<Price> => {
        const ticker = await fetchJson<BinancePriceTicker>(
          "/api/v3/ticker/price",
          { symbol },
          signal,
        );
        return {
          datetime: new Date().toISOString(),
          mid: ticker.price,
        };
      },
    }),
};

export const chartPrices = {
  queryOptions: (symbol: string, timeFrame: TimeFrame) =>
    queryOptions({
      queryKey: ["ChartPrices", { symbol, timeFrame }] as const,
      queryFn: async ({ signal }): Promise<ChartPrice[]> => {
        const { interval, limit } = CHART_PARAMS[timeFrame];
        const klines = await fetchJson<BinanceKline[]>(
          "/api/v3/klines",
          { symbol, interval, limit },
          signal,
        );
        // Binance returns klines oldest-first; the rest of the app
        // expects newest-first, so reverse while mapping.
        const points: ChartPrice[] = new Array(klines.length);
        for (let i = 0; i < klines.length; i++) {
          const [openTime, , , , close] = klines[klines.length - 1 - i];
          points[i] = {
            datetime: new Date(openTime).toISOString(),
            rate: close,
          };
        }
        return points;
      },
    }),
};
