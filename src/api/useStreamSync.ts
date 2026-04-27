import { useEffect } from "react";
import { getDefaultStore, useAtomValue } from "jotai";

import type { TickerSymbol } from "@/ticker/tickers";
import type { ChartPrice, TimeFrame } from "./types";
import { CHART_PARAMS, INTERVAL_TO_TIMEFRAME, fetchKlines } from "./rest";
import { getStreamClient, type StreamMessage } from "./stream";
import {
  ALL_SYMBOLS,
  connectionStateAtom,
  klinesStateAtom,
  priceAtomFamily,
  sparklineAtomFamily,
  symbolAtom,
  timeFrameAtom,
} from "./atoms";

const SPARKLINE_TIMEFRAME: TimeFrame = "DAY";
const SPARKLINE_INTERVAL = CHART_PARAMS[SPARKLINE_TIMEFRAME].interval;
const SPARKLINE_LIMIT = CHART_PARAMS[SPARKLINE_TIMEFRAME].limit;

const KNOWN_SYMBOLS = new Set<string>(ALL_SYMBOLS);

function klineStream(symbol: TickerSymbol, interval: string): string {
  return `${symbol.toLowerCase()}@kline_${interval}`;
}

function amendKlines(
  current: ChartPrice[],
  k: { t: number; c: string },
  limit: number,
): ChartPrice[] {
  const point: ChartPrice = {
    datetime: new Date(k.t).toISOString(),
    rate: k.c,
  };
  if (current.length === 0) return [point];
  const latest = current[0];
  if (point.datetime === latest.datetime) {
    // Same bar, in-place update with the latest close.
    return [point, ...current.slice(1)];
  }
  if (point.datetime > latest.datetime) {
    // Next bar opened — prepend and trim so the window stays bounded.
    const grown = [point, ...current];
    return grown.length > limit ? grown.slice(0, limit) : grown;
  }
  return current;
}

function handleMessage(msg: StreamMessage): void {
  if (msg.kind !== "kline") return; // only kline streams are subscribed
  const symbol = msg.data.s;
  if (!KNOWN_SYMBOLS.has(symbol)) return;
  const typedSymbol = symbol as TickerSymbol;
  const k = msg.data.k;
  const interval = k.i;
  const store = getDefaultStore();

  // Live price for this symbol — drives both row display and the
  // expanded header via `currentPriceAtom`.
  const priceAtom = priceAtomFamily(typedSymbol);
  const existingPrice = store.get(priceAtom);
  if (!existingPrice || existingPrice.mid !== k.c) {
    store.set(priceAtom, {
      datetime: new Date(msg.data.E).toISOString(),
      mid: k.c,
    });
  }

  // Sparkline: all symbols get 5m kline updates.
  if (interval === SPARKLINE_INTERVAL) {
    const sparkAtom = sparklineAtomFamily(typedSymbol);
    const current = store.get(sparkAtom);
    if (current.status === "success") {
      const latest = current.data[0];
      const sameBar = latest && new Date(k.t).toISOString() === latest.datetime;
      if (!sameBar || latest.rate !== k.c) {
        store.set(sparkAtom, {
          status: "success",
          data: amendKlines(current.data, k, SPARKLINE_LIMIT),
        });
      }
    }
  }

  // Big chart: only if this kline matches the expanded symbol at its
  // active timeframe.
  const expanded = store.get(symbolAtom);
  if (expanded !== typedSymbol) return;
  const activeTimeFrame = store.get(timeFrameAtom);
  if (INTERVAL_TO_TIMEFRAME[interval] !== activeTimeFrame) return;
  const chartState = store.get(klinesStateAtom);
  if (chartState.status !== "success") return;
  const latest = chartState.data[0];
  const sameBar = latest && new Date(k.t).toISOString() === latest.datetime;
  if (sameBar && latest.rate === k.c) return;
  const { limit } = CHART_PARAMS[activeTimeFrame];
  store.set(klinesStateAtom, {
    status: "success",
    data: amendKlines(chartState.data, k, limit),
  });
}

function seedSparklines(): void {
  const store = getDefaultStore();
  for (const symbol of ALL_SYMBOLS) {
    store.set(sparklineAtomFamily(symbol), { status: "loading" });
    fetchKlines(symbol, SPARKLINE_TIMEFRAME)
      .then((data) => {
        store.set(sparklineAtomFamily(symbol), { status: "success", data });
        if (data.length > 0 && !store.get(priceAtomFamily(symbol))) {
          store.set(priceAtomFamily(symbol), {
            datetime: data[0].datetime,
            mid: data[0].rate,
          });
        }
      })
      .catch((error: unknown) => {
        store.set(sparklineAtomFamily(symbol), {
          status: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });
  }
}

let initialized = false;
function initStreamSync(): void {
  if (initialized) return;
  initialized = true;
  const client = getStreamClient();
  const store = getDefaultStore();
  client.onState((state) => store.set(connectionStateAtom, state));
  client.onMessage(handleMessage);

  // Always-on 5m kline subscription for every known symbol. These
  // drive live prices (close amended on every tick) and the sparklines.
  client.subscribe(ALL_SYMBOLS.map((s) => klineStream(s, SPARKLINE_INTERVAL)));

  seedSparklines();
}

function runBackfill(
  symbol: TickerSymbol,
  timeFrame: TimeFrame,
  controller: AbortController,
): void {
  const store = getDefaultStore();
  store.set(klinesStateAtom, { status: "loading" });
  fetchKlines(symbol, timeFrame, controller.signal)
    .then((data) => {
      if (controller.signal.aborted) return;
      store.set(klinesStateAtom, { status: "success", data });
    })
    .catch((error: unknown) => {
      if (controller.signal.aborted) return;
      store.set(klinesStateAtom, {
        status: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });
}

/**
 * Single source of truth for the live stream lifecycle. Call once near
 * the root of the tree. On mount it opens the always-on miniTicker-ish
 * fan-out (5m klines for every symbol). When a row is expanded it adds
 * any extra kline stream the big chart needs and runs the REST backfill.
 */
export function useStreamSync(): void {
  const expandedSymbol = useAtomValue(symbolAtom);
  const timeFrame = useAtomValue(timeFrameAtom);

  useEffect(() => {
    initStreamSync();
  }, []);

  useEffect(() => {
    if (!expandedSymbol) {
      getDefaultStore().set(klinesStateAtom, { status: "idle" });
      return;
    }
    const controller = new AbortController();
    const client = getStreamClient();
    const interval = CHART_PARAMS[timeFrame].interval;
    // Skip if the 5m sparkline subscription already carries it.
    const extraStream =
      interval === SPARKLINE_INTERVAL
        ? null
        : klineStream(expandedSymbol, interval);
    if (extraStream) client.subscribe([extraStream]);
    runBackfill(expandedSymbol, timeFrame, controller);
    return () => {
      controller.abort();
      if (extraStream) client.unsubscribe([extraStream]);
    };
  }, [expandedSymbol, timeFrame]);
}

/** Force-refetch the expanded (symbol, timeFrame) klines. */
export function retryKlinesBackfill(
  symbol: TickerSymbol,
  timeFrame: TimeFrame,
): void {
  runBackfill(symbol, timeFrame, new AbortController());
}
