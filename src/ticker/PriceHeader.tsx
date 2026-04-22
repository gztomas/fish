import type { ReactNode } from "react";
import type { TimeFrame } from "@/api/types";
import { cn } from "@/ui/cn";
import { Odometer } from "@/ticker/Odometer";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDownRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { formatPercentChange, formatUsd, getPriceDecimals } from "./format";
import type { ChartStats } from "./stats";
import type { Ticker } from "./tickers";

const TIMEFRAME_LABEL: Record<TimeFrame, string> = {
  DAY: "past day",
  WEEK: "past week",
  MONTH: "past month",
  YEAR: "past year",
  ALL: "all time",
};

export function TickerLabel({
  isRefreshing,
  isOffline,
}: {
  isRefreshing: boolean;
  isOffline: boolean;
}) {
  const dotLabel = isOffline ? "Offline" : isRefreshing ? "Refreshing" : "Live";
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "inline-flex size-2 rounded-full transition-opacity",
          isOffline
            ? "bg-red-500 opacity-80"
            : cn(
                "bg-emerald-500",
                isRefreshing ? "animate-pulse opacity-80" : "opacity-50",
              ),
        )}
        aria-label={dotLabel}
      />
      {isOffline && (
        <span className="text-xs font-medium uppercase tracking-wider text-red-500">
          Offline
        </span>
      )}
    </div>
  );
}

export function PriceHeader({
  currentPrice,
  stats,
  timeFrame,
  ticker,
  isOffline,
  rightSlot,
}: {
  currentPrice: number | null;
  stats: ChartStats | null;
  timeFrame: TimeFrame;
  ticker: Ticker;
  isOffline: boolean;
  rightSlot?: ReactNode;
}) {
  const isPositive = (stats?.change ?? 0) >= 0;
  const arrowIcon = isPositive ? ArrowUpRight01Icon : ArrowDownRight01Icon;
  const reference = currentPrice ?? stats?.low ?? 0;
  const decimals = getPriceDecimals(reference);
  // Over ALL, the first chart point is cents, so the ratio explodes
  // into the millions of percent. The dollar change still reads fine.
  const percentLabel =
    timeFrame === "ALL" ? "N/A" : formatPercentChange(stats?.changeRatio ?? 0);

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
            {ticker.name}
          </span>
          <Odometer
            value={currentPrice}
            format={(v) => formatUsd(v, decimals)}
            className={cn(
              "text-3xl font-semibold tracking-tight leading-none transition-colors",
              isOffline && "text-muted-foreground",
            )}
          />
        </div>
        {rightSlot}
      </div>

      {stats && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium tabular-nums rounded-full px-2 py-1",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
              : "text-red-600 dark:text-red-400 bg-red-500/10",
          )}
        >
          <HugeiconsIcon
            icon={arrowIcon}
            className="size-4"
            aria-hidden="true"
          />
          {formatUsd(Math.abs(stats.change), decimals)} ({percentLabel}) ·{" "}
          {TIMEFRAME_LABEL[timeFrame]}
        </span>
      )}
    </div>
  );
}
