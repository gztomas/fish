import type { TimeFrame } from "@/api/types";
import {
  formatPercentChange,
  formatTooltipDate,
  formatUsd,
  getPriceDecimals,
} from "@/ticker/format";
import { cn } from "@/ui/cn";

export type HoverPoint = {
  timestamp: number;
  rate: number;
};

export type BrushRange = {
  start: HoverPoint;
  end: HoverPoint;
};

export function HoverDetail({
  point,
  brush,
  timeFrame,
}: {
  point: HoverPoint | null;
  brush: BrushRange | null;
  timeFrame: TimeFrame;
}) {
  if (brush) {
    const change = brush.end.rate - brush.start.rate;
    const ratio = brush.start.rate === 0 ? 0 : change / brush.start.rate;
    const isPositive = change >= 0;
    const decimals = getPriceDecimals(brush.start.rate);
    return (
      <div className="min-h-10 text-right tabular-nums" aria-live="polite">
        <div className="text-xs text-muted-foreground">
          {formatTooltipDate(brush.start.timestamp, timeFrame)} →{" "}
          {formatTooltipDate(brush.end.timestamp, timeFrame)}
        </div>
        <div
          className={cn(
            "text-sm font-semibold",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          {change > 0 ? "+" : ""}
          {formatUsd(change, decimals)} ({formatPercentChange(ratio)})
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-10 text-right tabular-nums" aria-live="polite">
      {point ? (
        <>
          <div className="text-xs text-muted-foreground">
            {formatTooltipDate(point.timestamp, timeFrame)}
          </div>
          <div className="text-sm font-semibold">
            {formatUsd(point.rate, getPriceDecimals(point.rate))}
          </div>
        </>
      ) : null}
    </div>
  );
}
