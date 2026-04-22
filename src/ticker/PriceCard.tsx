import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import {
  currentPriceAtom,
  isOfflineAtom,
  isRefreshingAtom,
  klinesStateAtom,
  liveStatsAtom,
  symbolAtom,
  timeFrameAtom,
} from "@/api/atoms";
import { retryKlinesBackfill, useStreamSync } from "@/api/useStreamSync";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import { HoverDetail, type BrushRange, type HoverPoint } from "./HoverDetail";
import { PriceChart } from "./PriceChart";
import { PriceHeader, TickerLabel } from "./PriceHeader";
import { StatsPanel } from "./StatsPanel";
import { findTicker } from "./tickers";
import { TickerSelector } from "./TickerSelector";
import { TimeFrameSelector } from "./TimeFrameSelector";

export function PriceCard() {
  useStreamSync();
  const [symbol, setSymbol] = useAtom(symbolAtom);
  const [timeFrame, setTimeFrame] = useAtom(timeFrameAtom);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);

  const currentPrice = useAtomValue(currentPriceAtom);
  const liveStats = useAtomValue(liveStatsAtom);
  const isOffline = useAtomValue(isOfflineAtom);
  const isRefreshing = useAtomValue(isRefreshingAtom);
  const klinesState = useAtomValue(klinesStateAtom);

  const ticker = findTicker(symbol);
  const currentMid = currentPrice ? Number(currentPrice.mid) : null;

  let chart;
  if (klinesState.status === "error") {
    chart = (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
        <HugeiconsIcon icon={Alert02Icon} className="size-6 text-destructive" />
        <div className="text-center">
          <div className="font-medium text-foreground">
            Couldn't load price data
          </div>
          <div className="text-xs">{klinesState.error.message}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => retryKlinesBackfill(symbol, timeFrame)}
        >
          Try again
        </Button>
      </div>
    );
  } else if (klinesState.status !== "success") {
    chart = (
      <div
        className="h-80 w-full animate-pulse rounded-lg bg-muted/60"
        role="status"
        aria-label="Loading chart data"
      />
    );
  } else {
    chart = (
      <PriceChart
        points={klinesState.data}
        timeFrame={timeFrame}
        ticker={ticker}
        brushRange={brushRange}
        onHoverChange={setHoverPoint}
        onBrushChange={setBrushRange}
      />
    );
  }

  return (
    <Card className="w-full gap-6 py-6">
      <CardHeader className="gap-4 px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TickerSelector value={symbol} onChange={setSymbol} />
            <TickerLabel isRefreshing={isRefreshing} isOffline={isOffline} />
          </div>
          <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} />
        </div>
        <PriceHeader
          currentPrice={currentMid}
          stats={liveStats}
          timeFrame={timeFrame}
          ticker={ticker}
          isOffline={isOffline}
          rightSlot={
            <HoverDetail
              point={hoverPoint}
              brush={brushRange}
              timeFrame={timeFrame}
            />
          }
        />
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        {chart}
        {liveStats && <StatsPanel stats={liveStats} timeFrame={timeFrame} />}
      </CardContent>
    </Card>
  );
}
