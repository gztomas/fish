import type { Page, Route } from "@playwright/test";
import type { TimeFrame } from "../src/api/types";

export type MockPricePoint = {
  datetime: string;
  rate: number;
};

export type PriceBundleMock = {
  currentMid: number;
  // Points may be written in any order; they are sorted by datetime
  // before being emitted as Binance klines so the test reads naturally.
  chartPrices: MockPricePoint[];
};

export type RouteInterceptOptions = {
  // Per-timeframe overrides (checked after bySymbol).
  bundles?: Partial<Record<TimeFrame, PriceBundleMock>>;
  // Per-symbol overrides (highest precedence).
  bySymbol?: Record<string, PriceBundleMock>;
  // Fallback when nothing more specific matches.
  defaultBundle?: PriceBundleMock;
  // Fail the first N ticker/price requests, then serve the real mock.
  failCurrentPrice?: number;
  // Fail the first N klines requests per timeframe, then serve the mock.
  failChart?: Partial<Record<TimeFrame, number>>;
};

const BINANCE_URL = /^https:\/\/api\.binance\.com\//;

// Keep in sync with CHART_PARAMS in src/api/queries.ts.
const INTERVAL_TO_TIMEFRAME: Record<string, TimeFrame> = {
  "5m": "DAY",
  "1h": "WEEK",
  "4h": "MONTH",
  "1d": "YEAR",
  "1w": "ALL",
};

function tickerResponse(symbol: string, bundle: PriceBundleMock) {
  return { symbol, price: bundle.currentMid.toFixed(2) };
}

// Binance kline: [openTime, open, high, low, close, volume, closeTime,
// quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]. The app
// only reads openTime and close, but we fill the rest with plausible
// values so the shape matches real responses.
function klinesResponse(bundle: PriceBundleMock) {
  const sorted = [...bundle.chartPrices].sort(
    (a, b) => toMs(a.datetime) - toMs(b.datetime),
  );
  return sorted.map((p) => {
    const openTime = toMs(p.datetime);
    const price = p.rate.toFixed(2);
    return [
      openTime,
      price,
      price,
      price,
      price,
      "0",
      openTime + 1,
      "0",
      0,
      "0",
      "0",
      "0",
    ];
  });
}

function toMs(datetime: string): number {
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(datetime)
    ? datetime
    : `${datetime}Z`;
  return new Date(withZone).getTime();
}

function failureResponse(status: number, message: string) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ code: -1000, msg: message }),
  };
}

function resolveBundle(
  options: RouteInterceptOptions,
  symbol: string,
  timeFrame: TimeFrame,
): PriceBundleMock | undefined {
  return (
    options.bySymbol?.[symbol] ??
    options.bundles?.[timeFrame] ??
    options.defaultBundle
  );
}

export async function mockBinanceApi(
  page: Page,
  options: RouteInterceptOptions,
) {
  let currentPriceFailuresLeft = options.failCurrentPrice ?? 0;
  const chartFailuresLeft: Partial<Record<TimeFrame, number>> = {
    ...options.failChart,
  };

  await page.route(BINANCE_URL, async (route: Route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(request.url());
    const path = url.pathname;
    const symbol = url.searchParams.get("symbol") ?? "";

    if (path === "/api/v3/ticker/price") {
      if (currentPriceFailuresLeft > 0) {
        currentPriceFailuresLeft--;
        await route.fulfill(
          failureResponse(500, "simulated ticker/price failure"),
        );
        return;
      }
      const bundle = options.bySymbol?.[symbol] ?? options.defaultBundle;
      if (!bundle) {
        await route.fulfill(
          failureResponse(500, "No mock bundle configured for ticker/price"),
        );
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tickerResponse(symbol, bundle)),
      });
      return;
    }

    if (path === "/api/v3/klines") {
      const interval = url.searchParams.get("interval") ?? "";
      const timeFrame = INTERVAL_TO_TIMEFRAME[interval];
      if (!timeFrame) {
        await route.fulfill(
          failureResponse(400, `unknown kline interval: ${interval}`),
        );
        return;
      }
      const remaining = chartFailuresLeft[timeFrame] ?? 0;
      if (remaining > 0) {
        chartFailuresLeft[timeFrame] = remaining - 1;
        await route.fulfill(
          failureResponse(500, `simulated klines ${timeFrame} failure`),
        );
        return;
      }
      const bundle = resolveBundle(options, symbol, timeFrame);
      if (!bundle) {
        await route.fulfill(
          failureResponse(
            500,
            `No mock bundle configured for klines ${timeFrame}`,
          ),
        );
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(klinesResponse(bundle)),
      });
      return;
    }

    await route.fulfill(failureResponse(404, `Unknown path: ${path}`));
  });
}

export function buildMonthSeries(
  basePrice: number,
  points = 30,
): MockPricePoint[] {
  const base = Date.UTC(2026, 3, 13, 12, 0, 0);
  const out: MockPricePoint[] = [];
  for (let i = 0; i < points; i++) {
    const offset = i - points + 1;
    const rate = basePrice + Math.sin(i / 3) * 500 + i * 12;
    out.push({
      datetime: new Date(base + offset * 3_600_000)
        .toISOString()
        .replace("Z", ""),
      rate,
    });
  }
  return out;
}
