import { useRef } from "react";
import { extent } from "d3-array";
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPrice, TimeFrame } from "@/api/types";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/ui/chart";
import type { Ticker } from "./tickers";
import {
  buildChartAriaLabel,
  buildCompactUsdFormatter,
  pointFromState,
  Y_TICK_COUNT,
  type BrushRange,
  type ChartDatum,
  type HoverPoint,
} from "./priceChartViz";

export function PriceChart({
  points,
  timeFrame,
  ticker,
  brushRange,
  onHoverChange,
  onBrushChange,
}: {
  points: ChartPrice[];
  timeFrame: TimeFrame;
  ticker: Ticker;
  brushRange: BrushRange | null;
  onHoverChange?: (point: HoverPoint | null) => void;
  onBrushChange?: (range: BrushRange | null) => void;
}) {
  const dragStartRef = useRef<ChartDatum | null>(null);

  // Points arrive newest-first, so we walk in reverse to land chronological.
  const data: ChartDatum[] = points.map((_, i) => {
    const p = points[points.length - 1 - i];
    return {
      timestamp: new Date(p.datetime).getTime(),
      rate: Number(p.rate),
    };
  });

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground sm:h-80">
        No chart data available.
      </div>
    );
  }

  const [minRate = 0, maxRate = 0] = extent(data, (d) => d.rate);

  const chartConfig = {
    rate: {
      label: `${ticker.shortName} price`,
      color: ticker.color,
    },
  } satisfies ChartConfig;

  const yStep = (maxRate - minRate) / Y_TICK_COUNT;
  const format = buildCompactUsdFormatter(yStep, maxRate);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 w-full sm:h-80"
      role="img"
      aria-label={buildChartAriaLabel(timeFrame, ticker.name)}
      initialDimension={{ width: 800, height: 320 }}
    >
      <AreaChart
        data={data}
        margin={{ top: 16, right: 0, left: 0, bottom: 0 }}
        onMouseDown={(state) => {
          const p = pointFromState(state, data);
          if (p) dragStartRef.current = p;
        }}
        onMouseMove={(state) => {
          const p = pointFromState(state, data);
          onHoverChange?.(p);
          const start = dragStartRef.current;
          if (start && p && p.timestamp !== start.timestamp) {
            onBrushChange?.(
              start.timestamp <= p.timestamp
                ? { start, end: p }
                : { start: p, end: start },
            );
          }
        }}
        onMouseUp={() => {
          dragStartRef.current = null;
          onBrushChange?.(null);
        }}
        onMouseLeave={() => {
          onHoverChange?.(null);
          dragStartRef.current = null;
          onBrushChange?.(null);
        }}
      >
        <defs>
          <linearGradient id="price-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-rate)"
              stopOpacity={0.35}
            />
            <stop offset="100%" stopColor="var(--color-rate)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={["dataMin", "dataMax"]}
          hide
        />
        <YAxis domain={["auto", "auto"]} hide />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={() => null}
        />
        <ReferenceLine
          y={maxRate}
          stroke="var(--muted-foreground)"
          strokeDasharray="2 4"
          strokeOpacity={0.5}
          label={{
            value: format(maxRate),
            position: "insideTopLeft",
            fill: "var(--muted-foreground)",
            fontSize: 12,
          }}
        />
        <ReferenceLine
          y={minRate}
          stroke="var(--muted-foreground)"
          strokeDasharray="2 4"
          strokeOpacity={0.5}
          label={{
            value: format(minRate),
            position: "insideBottomLeft",
            fill: "var(--muted-foreground)",
            fontSize: 12,
          }}
        />
        {brushRange && (
          <ReferenceArea
            x1={brushRange.start.timestamp}
            x2={brushRange.end.timestamp}
            fill="var(--color-rate)"
            fillOpacity={0.15}
            stroke="var(--color-rate)"
            strokeOpacity={0.4}
          />
        )}
        <Area
          type="monotone"
          dataKey="rate"
          stroke="var(--color-rate)"
          strokeWidth={2}
          fill="url(#price-gradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
