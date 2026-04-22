import type { Page, Route, WebSocketRoute } from "@playwright/test";
import { INTERVAL_TO_TIMEFRAME } from "../src/api/rest";
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
  // Fail the first N klines requests per timeframe, then serve the mock.
  failChart?: Partial<Record<TimeFrame, number>>;
};

export type SubscribeLogEntry = { method: string; streams: string[] };
export type BinanceMockHandle = {
  subscribes: SubscribeLogEntry[];
};

const BINANCE_REST_URL = /^https:\/\/api\.binance\.com\//;
const BINANCE_WS_URL = /^wss:\/\/stream\.binance\.com:9443\//;

function klinesResponse(bundle: PriceBundleMock) {
  const sorted = [...bundle.chartPrices].sort(
    (a, b) => toMs(a.datetime) - toMs(b.datetime),
  );
  return sorted.map((p) => {
    const openTime = toMs(p.datetime);
    const price = p.rate.toFixed(2);
    // [openTime, open, high, low, close, volume, closeTime, ...].
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

function klineMessage(
  stream: string,
  symbol: string,
  interval: string,
  bundle: PriceBundleMock,
) {
  const now = Date.now();
  const price = bundle.currentMid.toFixed(2);
  return {
    stream,
    data: {
      e: "kline",
      E: now,
      s: symbol,
      k: {
        t: now,
        T: now + 1,
        s: symbol,
        i: interval,
        o: price,
        c: price,
        h: price,
        l: price,
        x: false,
      },
    },
  };
}

export async function mockBinanceApi(
  page: Page,
  options: RouteInterceptOptions,
): Promise<BinanceMockHandle> {
  const subscribes: SubscribeLogEntry[] = [];
  const chartFailuresLeft: Partial<Record<TimeFrame, number>> = {
    ...options.failChart,
  };

  // REST: klines backfill.
  await page.route(BINANCE_REST_URL, async (route: Route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }
    const url = new URL(request.url());
    if (url.pathname !== "/api/v3/klines") {
      await route.fulfill(
        failureResponse(404, `Unknown path: ${url.pathname}`),
      );
      return;
    }
    const interval = url.searchParams.get("interval") ?? "";
    const symbol = url.searchParams.get("symbol") ?? "";
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
          `No mock bundle configured for klines ${symbol} ${timeFrame}`,
        ),
      );
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(klinesResponse(bundle)),
    });
  });

  // WebSocket: combined stream with SUBSCRIBE/UNSUBSCRIBE control frames.
  // The app only subscribes to `<symbol>@kline_<interval>` streams now; on
  // SUBSCRIBE we push a single kline with the bundle's currentMid as close
  // so each row's priceAtom gets a value.
  await page.routeWebSocket(BINANCE_WS_URL, (ws: WebSocketRoute) => {
    ws.onMessage((raw) => {
      const text = typeof raw === "string" ? raw : raw.toString();
      let parsed: { method?: string; params?: string[]; id?: number };
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      if (parsed.method === "SUBSCRIBE" && Array.isArray(parsed.params)) {
        subscribes.push({ method: "SUBSCRIBE", streams: parsed.params });
        ws.send(JSON.stringify({ result: null, id: parsed.id ?? 0 }));
        for (const stream of parsed.params) {
          const match = /^([a-z0-9]+)@kline_([a-z0-9]+)$/.exec(stream);
          if (!match) continue;
          const symbol = match[1].toUpperCase();
          const interval = match[2];
          const timeFrame = INTERVAL_TO_TIMEFRAME[interval];
          if (!timeFrame) continue;
          const bundle = resolveBundle(options, symbol, timeFrame);
          if (!bundle) continue;
          ws.send(
            JSON.stringify(klineMessage(stream, symbol, interval, bundle)),
          );
        }
      } else if (
        parsed.method === "UNSUBSCRIBE" &&
        Array.isArray(parsed.params)
      ) {
        subscribes.push({ method: "UNSUBSCRIBE", streams: parsed.params });
        ws.send(JSON.stringify({ result: null, id: parsed.id ?? 0 }));
      }
    });
  });

  return { subscribes };
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
