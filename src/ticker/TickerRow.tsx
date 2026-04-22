import { useAtom, useAtomValue } from "jotai";
import { useState } from "react";
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
import { Button } from "@/ui/button";
import { cn } from "@/ui/cn";

import { formatPercentChange, formatUsd, getPriceDecimals } from "./format";
import { HoverDetail, type BrushRange, type HoverPoint } from "./HoverDetail";
import { Odometer } from "./Odometer";
import { PriceChart } from "./PriceChart";
import { Sparkline } from "./Sparkline";
import type { KnownTicker } from "./tickers";
import { TimeFrameSelector } from "./TimeFrameSelector";
import { computeChartStats } from "./stats";

export function TickerRow({ ticker }: { ticker: KnownTicker }) {
  const [expanded, setExpanded] = useAtom(symbolAtom);
  const price = useAtomValue(priceAtomFamily(ticker.symbol));
  const sparkline = useAtomValue(sparklineAtomFamily(ticker.symbol));

  const isExpanded = expanded === ticker.symbol;
  const sparklinePoints =
    sparkline.status === "success" ? sparkline.data : null;
  const dayStats = sparklinePoints ? computeChartStats(sparklinePoints) : null;
  const currentMid = price ? Number(price.mid) : null;
  const reference = currentMid ?? dayStats?.last ?? 0;
  const decimals = getPriceDecimals(reference);
  const changeRatio = dayStats?.changeRatio ?? 0;
  const isPositive = changeRatio >= 0;

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
        <div className="flex flex-col">
          <span className="text-base font-semibold leading-tight">
            {ticker.name}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {ticker.shortName}
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Odometer
            value={currentMid}
            format={(v) => formatUsd(v, decimals)}
            className="text-base font-semibold leading-none"
          />
          {dayStats && (
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
              {formatPercentChange(changeRatio)}
            </span>
          )}
        </div>

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
          {isExpanded && <ExpandedChart ticker={ticker} />}
        </div>
      </div>
    </div>
  );
}

function ExpandedChart({ ticker }: { ticker: KnownTicker }) {
  const [timeFrame, setTimeFrame] = useAtom(timeFrameAtom);
  const klinesState = useAtomValue(klinesStateAtom);
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);
  const [brushRange, setBrushRange] = useState<BrushRange | null>(null);

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="flex items-center justify-between gap-4">
        <TimeFrameSelector value={timeFrame} onChange={setTimeFrame} />
        <HoverDetail
          point={hoverPoint}
          brush={brushRange}
          timeFrame={timeFrame}
        />
      </div>

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
          onHoverChange={setHoverPoint}
          onBrushChange={setBrushRange}
        />
      )}
    </div>
  );
}
