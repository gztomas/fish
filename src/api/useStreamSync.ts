import { useEffect } from "react";
import { getDefaultStore, useAtomValue } from "jotai";

import type { TickerSymbol } from "@/ticker/tickers";
import type { ChartPrice, TimeFrame } from "./types";
import { CHART_PARAMS, INTERVAL_TO_TIMEFRAME, fetchKlines } from "./rest";
import { getStreamClient, type StreamMessage } from "./stream";
import {
  connectionStateAtom,
  currentPriceAtom,
  klinesStateAtom,
  symbolAtom,
  timeFrameAtom,
} from "./atoms";

function streamsFor(symbol: TickerSymbol, timeFrame: TimeFrame): string[] {
  const s = symbol.toLowerCase();
  return [`${s}@miniTicker`, `${s}@kline_${CHART_PARAMS[timeFrame].interval}`];
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
  const store = getDefaultStore();
  // Guards: server-side UNSUBSCRIBE isn't instantaneous, so a packet
  // for the previous selection can race a switch. Drop anything that
  // doesn't match the currently displayed pair.
  const activeSymbol = store.get(symbolAtom);
  if (msg.data.s !== activeSymbol) return;

  if (msg.kind === "miniTicker") {
    const existing = store.get(currentPriceAtom);
    if (existing?.mid === msg.data.c) return;
    store.set(currentPriceAtom, {
      datetime: new Date(msg.data.E).toISOString(),
      mid: msg.data.c,
    });
    return;
  }

  const activeTimeFrame = store.get(timeFrameAtom);
  if (INTERVAL_TO_TIMEFRAME[msg.data.k.i] !== activeTimeFrame) return;
  const current = store.get(klinesStateAtom);
  if (current.status !== "success") return; // wait for backfill
  const latest = current.data[0];
  const sameBar =
    latest && new Date(msg.data.k.t).toISOString() === latest.datetime;
  if (sameBar && latest.rate === msg.data.k.c) return;
  const { limit } = CHART_PARAMS[activeTimeFrame];
  store.set(klinesStateAtom, {
    status: "success",
    data: amendKlines(current.data, msg.data.k, limit),
  });
}

let initialized = false;
function initStreamSync(): void {
  if (initialized) return;
  initialized = true;
  const client = getStreamClient();
  const store = getDefaultStore();
  client.onState((state) => store.set(connectionStateAtom, state));
  client.onMessage(handleMessage);
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
 * the root of the tree. On each (symbol, timeFrame) change it
 * unsubscribes the previous streams, resets the per-pair atoms,
 * subscribes to the new streams, and fires the REST klines backfill.
 */
export function useStreamSync(): void {
  const symbol = useAtomValue(symbolAtom);
  const timeFrame = useAtomValue(timeFrameAtom);

  useEffect(() => {
    initStreamSync();
  }, []);

  useEffect(() => {
    // Clear stale price so the header doesn't flash the previous
    // ticker's number while we wait for the first new miniTicker.
    getDefaultStore().set(currentPriceAtom, null);
    const controller = new AbortController();
    const client = getStreamClient();
    const streams = streamsFor(symbol, timeFrame);
    client.subscribe(streams);
    runBackfill(symbol, timeFrame, controller);
    return () => {
      controller.abort();
      client.unsubscribe(streams);
    };
  }, [symbol, timeFrame]);
}

/** Force-refetch the current (symbol, timeFrame) klines. */
export function retryKlinesBackfill(
  symbol: TickerSymbol,
  timeFrame: TimeFrame,
): void {
  runBackfill(symbol, timeFrame, new AbortController());
}
