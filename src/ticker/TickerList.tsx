import { useStreamSync } from "@/api/useStreamSync";
import { Card } from "@/ui/card";

import { TickerRow } from "./TickerRow";
import { TICKERS } from "./tickers";

export function TickerList() {
  useStreamSync();
  return (
    <Card className="w-full overflow-hidden py-0 gap-0">
      {TICKERS.map((ticker) => (
        <TickerRow key={ticker.symbol} ticker={ticker} />
      ))}
    </Card>
  );
}
