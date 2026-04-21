import { atom, type WritableAtom } from "jotai";

import {
  DEFAULT_SYMBOL,
  isKnownSymbol,
  type TickerSymbol,
} from "@/ticker/tickers";
import { computeChartStats, computeLiveChartStats } from "@/ticker/stats";
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
  "DAY",
  "WEEK",
  "MONTH",
  "YEAR",
  "ALL",
];

function atomWithUrlParam<T extends string>(
  paramName: string,
  defaultValue: T,
  validate: (raw: string) => T | null,
): WritableAtom<T, [T], void> {
  const initial = ((): T => {
    if (typeof window === "undefined") return defaultValue;
    const raw = new URLSearchParams(window.location.search).get(paramName);
    if (!raw) return defaultValue;
    return validate(raw) ?? defaultValue;
  })();
  const base = atom<T>(initial);
  return atom(
    (get) => get(base),
    (_get, set, next: T) => {
      set(base, next);
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (next === defaultValue) {
        url.searchParams.delete(paramName);
      } else {
        url.searchParams.set(paramName, next.toLowerCase());
      }
      window.history.replaceState({}, "", url);
    },
  );
}

export const symbolAtom = atomWithUrlParam<TickerSymbol>(
  "ticker",
  DEFAULT_SYMBOL,
  (raw) => {
    const upper = raw.toUpperCase();
    return isKnownSymbol(upper) ? upper : null;
  },
);

export const timeFrameAtom = atomWithUrlParam<TimeFrame>(
  "timeframe",
  "DAY",
  (raw) => {
    const upper = raw.toUpperCase();
    return VALID_TIME_FRAMES.includes(upper as TimeFrame)
      ? (upper as TimeFrame)
      : null;
  },
);

export const connectionStateAtom = atom<ConnectionState>("closed");

// Live data for the currently selected (symbol, timeFrame). The stream
// sync layer clears these on switches and the message handler guards
// against stale packets, so a single slot is enough — we never display
// more than one pair at a time.
export const currentPriceAtom = atom<Price | null>(null);
export const klinesStateAtom = atom<AsyncState<ChartPrice[]>>({
  status: "idle",
});

export const klinesDataAtom = atom((get) => {
  const s = get(klinesStateAtom);
  return s.status === "success" ? s.data : null;
});

export const chartStatsAtom = atom((get) => {
  const data = get(klinesDataAtom);
  return data ? computeChartStats(data) : null;
});

export const isOfflineAtom = atom(
  (get) => get(connectionStateAtom) === "closed",
);

export const liveStatsAtom = atom((get) =>
  computeLiveChartStats(
    get(klinesDataAtom) ?? undefined,
    get(currentPriceAtom) ?? undefined,
    get(isOfflineAtom),
  ),
);

// True while the backfill is running — drives the header "refreshing" dot.
export const isRefreshingAtom = atom(
  (get) => get(klinesStateAtom).status === "loading",
);
