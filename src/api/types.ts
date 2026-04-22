/**
 * Normalized price shape the app works with.
 *
 * The Binance REST client in `queries.ts` adapts the upstream payloads
 * (arrays of klines, ticker objects) into these objects so `rate`/`mid`
 * arrive as decimal strings and `datetime` as an ISO-8601 UTC string.
 * Parsing to numbers happens where the values are consumed (chart,
 * stats, header), so the rest of the app sees one consistent shape.
 */

export type TimeFrame = "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL";

export type Price = {
  datetime: string;
  mid: string;
};

export type ChartPrice = {
  datetime: string;
  rate: string;
};
