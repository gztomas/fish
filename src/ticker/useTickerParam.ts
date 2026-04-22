import { useState } from "react";
import { DEFAULT_SYMBOL, isKnownSymbol, type TickerSymbol } from "./tickers";

const TICKER_PARAM = "ticker";

function readTickerFromUrl(): TickerSymbol {
  const raw = new URLSearchParams(window.location.search)
    .get(TICKER_PARAM)
    ?.toUpperCase();
  return raw && isKnownSymbol(raw) ? raw : DEFAULT_SYMBOL;
}

function writeTickerToUrl(next: TickerSymbol) {
  const url = new URL(window.location.href);
  if (next === DEFAULT_SYMBOL) {
    url.searchParams.delete(TICKER_PARAM);
  } else {
    url.searchParams.set(TICKER_PARAM, next.toLowerCase());
  }
  window.history.replaceState({}, "", url);
}

export function useTickerParam(): [TickerSymbol, (next: TickerSymbol) => void] {
  const [symbol, setSymbol] = useState<TickerSymbol>(readTickerFromUrl);
  const update = (next: TickerSymbol) => {
    setSymbol(next);
    writeTickerToUrl(next);
  };
  return [symbol, update];
}
