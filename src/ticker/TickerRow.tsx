import { useAtom, useAtomValue } from "jotai";
import { useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";

import {
  klinesStateAtom,
  priceAtomFamily,
  sparklineAtomFamily,
  symbolAtom,
  timeFrameAtom,
} from "@/api/atoms";
import { retryKlinesBackfill } from "@/api/useStreamSync";
import type { TimeFrame } from "@/api/types";
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";

import {
  formatPercentChange,
  formatTooltipDate,
  formatUsd,
  getPriceDecimals,
} from "./format";
import { Odometer } from "./Odometer";
import { PriceChart } from "./PriceChart";
import type { BrushRange, HoverPoint } from "./priceChartViz";
import { CoinIcon } from "./CoinIcon";
import { Sparkline } from "./Sparkline";
import type { KnownTicker } from "./tickers";
import { TimeFrameSelector } from "./TimeFrameSelector";
import { computeChartStats } from "./stats";

export function TickerRow({ ticker }: { ticker: KnownTicker }) {
  const [expanded, setExpanded] = useAtom(symbolAtom);
  const [timeFrame, setTimeFrame] = useAtom(timeFrameAtom);
  const price = useAtomValue(priceAtomFamily(ticker.symbol));
  const sparkline = useAtomValue(sparklineAtomFamily(ticker.symbol));
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);

  const isExpanded = expanded === ticker.symbol;
  const activeHover = isExpanded ? hoverPoint : null;
  const activeBrush = isExpanded ? brushRange : null;

  const sparklinePoints =
    sparkline.status === "success" ? sparkline.data : null;
  const dayStats = sparklinePoints ? computeChartStats(sparklinePoints) : null;
  const currentMid = price ? Number(price.mid) : null;
  const reference = currentMid ?? dayStats?.last ?? 0;
  const decimals = getPriceDecimals(reference);

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(isExpanded ? null : ticker.symbol)}
        aria-expanded={isExpanded}
        className={cn(
          "grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-6 py-4 text-left transition-colors",
          "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
          isExpanded && "bg-muted/30",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <CoinIcon ticker={ticker} className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold leading-tight">
              {ticker.name}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {ticker.shortName}
            </span>
          </div>
        </div>

        <RowValue
          currentMid={currentMid}
          decimals={decimals}
          dayStats={dayStats}
          hover={activeHover}
          brush={activeBrush}
          timeFrame={timeFrame}
        />

        <Sparkline
          points={sparklinePoints}
          color={ticker.color}
          className="h-10 w-24"
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {isExpanded && (
            <ExpandedChart
              ticker={ticker}
              timeFrame={timeFrame}
              onTimeFrameChange={setTimeFrame}
              brushRange={brushRange}
              onHoverChange={setHoverPoint}
              onBrushChange={setBrushRange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RowValue({
  currentMid,
  decimals,
  dayStats,
  hover,
  brush,
  timeFrame,
}: {
  currentMid: number | null;
  decimals: number;
  dayStats: ReturnType<typeof computeChartStats>;
  hover: HoverPoint | null;
  brush: BrushRange | null;
  timeFrame: TimeFrame;
}) {
  let top: ReactNode;
  let bottom: ReactNode;

  if (brush) {
    const change = brush.end.rate - brush.start.rate;
    const ratio = brush.start.rate === 0 ? 0 : change / brush.start.rate;
    const isPositive = change >= 0;
    top = (
      <span className="text-base font-semibold leading-none tabular-nums">
        {change >= 0 ? "+" : ""}
        {formatUsd(change, decimals)}
      </span>
    );
    bottom = (
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          isPositive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400",
        )}
      >
        {formatPercentChange(ratio)} ·{" "}
        {formatTooltipDate(brush.start.timestamp, timeFrame)} →{" "}
        {formatTooltipDate(brush.end.timestamp, timeFrame)}
      </span>
    );
  } else if (hover) {
    top = (
      <span className="text-base font-semibold leading-none tabular-nums">
        {formatUsd(hover.rate, decimals)}
      </span>
    );
    bottom = (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatTooltipDate(hover.timestamp, timeFrame)}
      </span>
    );
  } else {
    top = (
      <Odometer
        value={currentMid}
        format={(v) => formatUsd(v, decimals)}
        className="text-base font-semibold leading-none"
      />
    );
    if (dayStats) {
      const isPositive = dayStats.changeRatio >= 0;
      bottom = (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          <HugeiconsIcon
            icon={isPositive ? ArrowUpRight01Icon : ArrowDownRight01Icon}
            className="size-3"
            aria-hidden="true"
          />
          {formatPercentChange(dayStats.changeRatio)}
        </span>
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {top}
      {bottom}
    </div>
  );
}

function ExpandedChart({
  ticker,
  timeFrame,
  onTimeFrameChange,
  brushRange,
  onHoverChange,
  onBrushChange,
}: {
  ticker: KnownTicker;
  timeFrame: TimeFrame;
  onTimeFrameChange: (next: TimeFrame) => void;
  brushRange: BrushRange | null;
  onHoverChange: (point: HoverPoint | null) => void;
  onBrushChange: (range: BrushRange | null) => void;
}) {
  const klinesState = useAtomValue(klinesStateAtom);

  return (
    <div className="space-y-4 px-6 pb-6">
      {klinesState.status === "error" ? (
        <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm text-muted-foreground">
          <HugeiconsIcon
            icon={Alert02Icon}
            className="size-6 text-destructive"
          />
          <div className="text-center">
            <div className="font-medium text-foreground">
              Couldn't load price data
            </div>
            <div className="text-xs">{klinesState.error.message}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => retryKlinesBackfill(ticker.symbol, timeFrame)}
          >
            Try again
          </Button>
        </div>
      ) : klinesState.status !== "success" ? (
        <div
          className="h-80 w-full animate-pulse rounded-lg bg-muted/60"
          role="status"
          aria-label="Loading chart data"
        />
      ) : (
        <PriceChart
          points={klinesState.data}
          timeFrame={timeFrame}
          ticker={ticker}
          brushRange={brushRange}
          onHoverChange={onHoverChange}
          onBrushChange={onBrushChange}
        />
      )}

      <TimeFrameSelector value={timeFrame} onChange={onTimeFrameChange} />
    </div>
  );
}
