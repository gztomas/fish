import { atom, type WritableAtom } from "jotai";
import { atomFamily } from "jotai/utils";

import { isKnownSymbol, TICKERS, type TickerSymbol } from "@/ticker/tickers";
import type { ChartPrice, Price, TimeFrame } from "./types";
import type { ConnectionState } from "./stream";

// Discriminated union so consumers see loading/error states explicitly
// without reaching into a TanStack-style envelope. `idle` covers the
// moment before the backfill starts; `loading` covers in-flight.
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

const VALID_TIME_FRAMES: readonly TimeFrame[] = [
  "LIVE",
  "DAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL",
];

function atomWithUrlParam<T extends string>(
  paramName: string,
  defaultValue: T | null,
  validate: (raw: string) => T | null,
): WritableAtom<T | null, [T | null], void> {
  const initial = ((): T | null => {
    if (typeof window === "undefined") return defaultValue;
    const raw = new URLSearchParams(window.location.search).get(paramName);
    if (!raw) return defaultValue;
    return validate(raw) ?? defaultValue;
  })();
  const base = atom<T | null>(initial);
  return atom(
    (get) => get(base),
    (_get, set, next: T | null) => {
      set(base, next);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (next === null || next === defaultValue) {
        url.searchParams.delete(paramName);
      } else {
        url.searchParams.set(paramName, next.toLowerCase());
      }
      window.history.replaceState({}, "", url);
    },
  );
}

// null = nothing expanded; a symbol = that row is expanded and shows
// the big chart.
export const symbolAtom = atomWithUrlParam<TickerSymbol>(
  "ticker",
  null,
  (raw) => {
    const upper = raw.toUpperCase();
    return isKnownSymbol(upper) ? upper : null;
  },
);

const timeFrameUrlAtom = atomWithUrlParam<TimeFrame>(
  "timeframe",
  "DAY",
  (raw) => {
    const upper = raw.toUpperCase();
    return VALID_TIME_FRAMES.includes(upper as TimeFrame)
      ? (upper as TimeFrame)
      : null;
  },
);

// TimeFrame is never null downstream — collapse the URL atom's null
// (missing param) to the DAY default at read time.
export const timeFrameAtom = atom<TimeFrame, [TimeFrame], void>(
  (get) => get(timeFrameUrlAtom) ?? "DAY",
  (_get, set, next) => set(timeFrameUrlAtom, next),
);

export const connectionStateAtom = atom<ConnectionState>("closed");

// Per-symbol live price (miniTicker close amended by kline_5m close).
export const priceAtomFamily = atomFamily((_symbol: TickerSymbol) =>
  atom<Price | null>(null),
);

// Per-symbol 1D / 5m kline history. Seeded by REST on mount; amended by
// the kline_5m WS stream.
export const sparklineAtomFamily = atomFamily((_symbol: TickerSymbol) =>
  atom<AsyncState<ChartPrice[]>>({ status: "idle" }),
);

// Big-chart klines for the expanded symbol at the currently-selected
// timeframe. Cleared on every (symbol, timeFrame) switch by the stream
// sync layer.
export const klinesStateAtom = atom<AsyncState<ChartPrice[]>>({
  status: "idle",
});

export const klinesDataAtom = atom((get) => {
  const s = get(klinesStateAtom);
  return s.status === "success" ? s.data : null;
});

// Live price of the currently-expanded symbol, or null if nothing is
// expanded. Rows read priceAtomFamily directly; the expanded header
// reads this.
export const currentPriceAtom = atom<Price | null>((get) => {
  const symbol = get(symbolAtom);
  return symbol ? get(priceAtomFamily(symbol)) : null;
});

export const isOfflineAtom = atom(
  (get) => get(connectionStateAtom) === "closed",
);

// True while the expanded-chart backfill is running.
export const isRefreshingAtom = atom(
  (get) => get(klinesStateAtom).status === "loading",
);

// Convenience: the set of known symbols in display order.
export const ALL_SYMBOLS: readonly TickerSymbol[] = TICKERS.map(
  (t) => t.symbol,
);
