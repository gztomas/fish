import { useAtom, useAtomValue } from "jotai";
import { useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import {
  chartStatsAtom,
  currentPriceAtom,
  isOfflineAtom,
  isRefreshingAtom,
  klinesStateAtom,
  liveStatsAtom,
  symbolAtom,
  timeFrameAtom,
} from "@/api/atoms";
import { retryKlinesBackfill, useStreamSync } from "@/api/useStreamSync";
import type { TimeFrame } from "@/api/types";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import { HoverDetail, type BrushRange, type HoverPoint } from "./HoverDetail";
import { PriceChart } from "./PriceChart";
import { PriceHeader, TickerLabel } from "./PriceHeader";
import { StatsPanel } from "./StatsPanel";
import { findTicker, type Ticker } from "./tickers";
import { TickerSelector } from "./TickerSelector";
import { TimeFrameSelector } from "./TimeFrameSelector";

/**
 * Layout-only orchestrator. `useStreamSync` runs once here and drives
 * the atoms everything else reads from; the three data-owning children
 * subscribe at the finest grain their view needs, so the chart doesn't
 * re-render on miniTicker ticks and the header doesn't re-render on
 * every kline update.
 */
export function PriceCard() {
  useStreamSync();
  const [symbol, setSymbol] = useAtom(symbolAtom);
  const [timeFrame, setTimeFrame] = useAtom(timeFrameAtom);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);
  const ticker = findTicker(symbol);

  return (
    <Card className="w-full gap-6 py-6">
      <CardHeader className="gap-4 px-6">
        <LivePriceHeader
          ticker={ticker}
          timeFrame={timeFrame}
          tickerSelector={
            <TickerSelector value={symbol} onChange={setSymbol} />
          }
          timeFrameSelector={
            <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} />
          }
          hoverDetail={
            <HoverDetail
              point={hoverPoint}
              brush={brushRange}
              timeFrame={timeFrame}
            />
          }
        />
      </CardHeader>

      <CardContent className="space-y-6 px-6">
        <ChartPanel
          ticker={ticker}
          timeFrame={timeFrame}
          brushRange={brushRange}
          onHoverChange={setHoverPoint}
          onBrushChange={setBrushRange}
        />
        <LiveStats timeFrame={timeFrame} />
      </CardContent>
    </Card>
  );
}

function LivePriceHeader({
  ticker,
  timeFrame,
  tickerSelector,
  timeFrameSelector,
  hoverDetail,
}: {
  ticker: Ticker;
  timeFrame: TimeFrame;
  tickerSelector: ReactNode;
  timeFrameSelector: ReactNode;
  hoverDetail: ReactNode;
}) {
  const currentPrice = useAtomValue(currentPriceAtom);
  const liveStats = useAtomValue(liveStatsAtom);
  const isOffline = useAtomValue(isOfflineAtom);
  const isRefreshing = useAtomValue(isRefreshingAtom);

  const currentMid = currentPrice ? Number(currentPrice.mid) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {tickerSelector}
          <TickerLabel isRefreshing={isRefreshing} isOffline={isOffline} />
        </div>
        {timeFrameSelector}
      </div>
      <PriceHeader
        currentPrice={currentMid}
        stats={liveStats}
        timeFrame={timeFrame}
        ticker={ticker}
        isOffline={isOffline}
        rightSlot={hoverDetail}
      />
    </>
  );
}

function ChartPanel({
  ticker,
  timeFrame,
  brushRange,
  onHoverChange,
  onBrushChange,
}: {
  ticker: Ticker;
  timeFrame: TimeFrame;
  brushRange: BrushRange | null;
  onHoverChange: (point: HoverPoint | null) => void;
  onBrushChange: (range: BrushRange | null) => void;
}) {
  const klinesState = useAtomValue(klinesStateAtom);
  const baseStats = useAtomValue(chartStatsAtom);
  const symbol = useAtomValue(symbolAtom);

  if (klinesState.status === "error") {
    return (
      <ErrorState
        message={klinesState.error.message}
        onRetry={() => retryKlinesBackfill(symbol, timeFrame)}
      />
    );
  }
  if (klinesState.status !== "success") {
    return <LoadingState />;
  }

  return (
    <PriceChart
      points={klinesState.data}
      stats={baseStats}
      timeFrame={timeFrame}
      ticker={ticker}
      brushRange={brushRange}
      onHoverChange={onHoverChange}
      onBrushChange={onBrushChange}
    />
  );
}

function LiveStats({ timeFrame }: { timeFrame: TimeFrame }) {
  const liveStats = useAtomValue(liveStatsAtom);
  if (!liveStats) return null;
  return <StatsPanel stats={liveStats} timeFrame={timeFrame} />;
}

function LoadingState() {
  return (
    <div
      className="h-80 w-full animate-pulse rounded-lg bg-muted/60"
      role="status"
      aria-label="Loading chart data"
    />
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
      <HugeiconsIcon icon={Alert02Icon} className="size-6 text-destructive" />
      <div className="text-center">
        <div className="font-medium text-foreground">
          Couldn't load price data
        </div>
        <div className="text-xs">{message}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
