import { useStreamSync } from "@/api/useStreamSync";

import { TickerRow } from "./TickerRow";
import { TICKERS } from "./tickers";

export function TickerList() {
  useStreamSync();
  return (
    <div className="w-full">
      {TICKERS.map((ticker) => (
        <TickerRow key={ticker.symbol} ticker={ticker} />
      ))}
    </div>
  );
}
