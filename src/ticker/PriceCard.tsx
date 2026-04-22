import { chartPrices as chartPricesQueries, currentPrice } from "@/api/queries";
import type { TimeFrame } from "@/api/types";
import { TickerSelector } from "@/ticker/TickerSelector";
import { TimeFrameSelector } from "@/ticker/TimeFrameSelector";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { useState, type ReactNode } from "react";
import { HoverDetail, type BrushRange, type HoverPoint } from "./HoverDetail";
import { PriceChart } from "./PriceChart";
import { PriceHeader, TickerLabel } from "./PriceHeader";
import { computeChartStats, computeLiveChartStats } from "./stats";
import { StatsPanel } from "./StatsPanel";
import { findTicker, type Ticker, type TickerSymbol } from "./tickers";
import { useTickerParam } from "./useTickerParam";
import { useTimeFrameParam } from "./useTimeFrameParam";

const CURRENT_PRICE_REFETCH_MS = 5_000;

const CHART_REFETCH_INTERVALS: Record<TimeFrame, number> = {
  DAY: 30_000,
  WEEK: 60_000,
  MONTH: 120_000,
  YEAR: 300_000,
  ALL: 300_000,
};

/**
 * Layout-only orchestrator: owns shared interaction state and composes
 * three data-owning children that don't know about each other.
 * `ChartPanel` owns the chart query; `LivePriceHeader` and `LiveStats`
 * own the price tick and share the chart cache via react-query (same
 * query key, one fetch). The chart is never touched by the 5s tick.
 */
export function PriceCard() {
  const [symbol, setSymbol] = useTickerParam();
  const [timeFrame, setTimeFrame] = useTimeFrameParam();
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);
  const ticker = findTicker(symbol);

  return (
    <Card className="w-full gap-6 py-6">
      <CardHeader className="gap-4 px-6">
        <LivePriceHeader
          symbol={symbol}
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
          symbol={symbol}
          ticker={ticker}
          timeFrame={timeFrame}
          brushRange={brushRange}
          onHoverChange={setHoverPoint}
          onBrushChange={setBrushRange}
        />
        <LiveStats symbol={symbol} timeFrame={timeFrame} />
      </CardContent>
    </Card>
  );
}

function LivePriceHeader({
  symbol,
  ticker,
  timeFrame,
  tickerSelector,
  timeFrameSelector,
  hoverDetail,
}: {
  symbol: TickerSymbol;
  ticker: Ticker;
  timeFrame: TimeFrame;
  tickerSelector: ReactNode;
  timeFrameSelector: ReactNode;
  hoverDetail: ReactNode;
}) {
  const priceQuery = usePriceQuery(symbol);
  const chartQuery = useChartQuery(symbol, timeFrame);

  const currentMid = priceQuery.data ? Number(priceQuery.data.mid) : null;

  // No retries + 15s client timeout → `isError` is a timely offline signal.
  const isOffline = priceQuery.isError;
  const isRefreshing =
    (priceQuery.isFetching && !priceQuery.isLoading) ||
    (chartQuery.isFetching && !chartQuery.isLoading);

  const liveStats = computeLiveChartStats(
    chartQuery.data,
    priceQuery.data,
    isOffline,
  );

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
  symbol,
  ticker,
  timeFrame,
  brushRange,
  onHoverChange,
  onBrushChange,
}: {
  symbol: TickerSymbol;
  ticker: Ticker;
  timeFrame: TimeFrame;
  brushRange: BrushRange | null;
  onHoverChange: (point: HoverPoint | null) => void;
  onBrushChange: (range: BrushRange | null) => void;
}) {
  const chartQuery = useChartQuery(symbol, timeFrame);

  if (chartQuery.error && !chartQuery.data) {
    return (
      <ErrorState
        message={chartQuery.error.message}
        onRetry={() => void chartQuery.refetch()}
      />
    );
  }

  if (chartQuery.isLoading && !chartQuery.data) {
    return <LoadingState />;
  }

  if (!chartQuery.data) return null;

  const baseStats = computeChartStats(chartQuery.data);

  return (
    <>
      <PriceChart
        points={chartQuery.data}
        stats={baseStats}
        timeFrame={timeFrame}
        ticker={ticker}
        brushRange={brushRange}
        onHoverChange={onHoverChange}
        onBrushChange={onBrushChange}
      />
      {chartQuery.error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <HugeiconsIcon icon={Alert02Icon} className="size-3.5" />
          Last chart refresh failed: {chartQuery.error.message}
        </div>
      )}
    </>
  );
}

function LiveStats({
  symbol,
  timeFrame,
}: {
  symbol: TickerSymbol;
  timeFrame: TimeFrame;
}) {
  const priceQuery = usePriceQuery(symbol);
  const chartQuery = useChartQuery(symbol, timeFrame);
  const liveStats = computeLiveChartStats(
    chartQuery.data,
    priceQuery.data,
    priceQuery.isError,
  );
  if (!liveStats) return null;
  return <StatsPanel stats={liveStats} timeFrame={timeFrame} />;
}

function usePriceQuery(symbol: TickerSymbol) {
  return useQuery({
    ...currentPrice.queryOptions(symbol),
    refetchInterval: CURRENT_PRICE_REFETCH_MS,
    staleTime: CURRENT_PRICE_REFETCH_MS,
  });
}

function useChartQuery(symbol: TickerSymbol, timeFrame: TimeFrame) {
  const ms = CHART_REFETCH_INTERVALS[timeFrame];
  return useQuery({
    ...chartPricesQueries.queryOptions(symbol, timeFrame),
    refetchInterval: ms,
    staleTime: ms,
  });
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
