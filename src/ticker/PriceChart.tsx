import { useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPrice, TimeFrame } from "@/api/types";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/ui/chart";
import { formatAxisDate, parseApiDatetime } from "./format";
import type { BrushRange, HoverPoint } from "./HoverDetail";
import type { Ticker } from "./tickers";
import {
  buildChartAriaLabel,
  buildCompactUsdFormatter,
  buildNiceYAxis,
  buildXTicks,
  pointFromState,
  X_TICK_COUNT,
  type ChartDatum,
} from "./priceChartViz";
import type { ChartStats } from "./stats";

export function PriceChart({
  points,
  stats,
  timeFrame,
  ticker,
  brushRange,
  onHoverChange,
  onBrushChange,
}: {
  points: ChartPrice[];
  stats: ChartStats | null;
  timeFrame: TimeFrame;
  ticker: Ticker;
  brushRange: BrushRange | null;
  onHoverChange?: (point: HoverPoint | null) => void;
  onBrushChange?: (range: BrushRange | null) => void;
}) {
  const dragStartRef = useRef<ChartDatum | null>(null);

  const isPositive = (stats?.change ?? 0) >= 0;

  const chartConfig = {
    rate: {
      label: `${ticker.shortName} price`,
      color: isPositive ? "var(--color-chart-up)" : "var(--color-chart-down)",
    },
  } satisfies ChartConfig;

  // Project the normalized API shape into numeric x/y for Recharts.
  // Points arrive newest-first, so we walk in reverse to land chronological.
  const data: ChartDatum[] = points.map((_, i) => {
    const p = points[points.length - 1 - i];
    return {
      timestamp: parseApiDatetime(p.datetime),
      rate: Number(p.rate),
    };
  });

  const { yDomain, yTicks, yStep } = buildNiceYAxis(stats);
  const yTickFormatter = buildCompactUsdFormatter(yStep, yDomain[1]);
  const xTicks = buildXTicks(
    data.map((d) => d.timestamp),
    X_TICK_COUNT[timeFrame],
  );

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground sm:h-80">
        No chart data available.
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-56 w-full sm:h-80"
      role="img"
      aria-label={buildChartAriaLabel(stats, timeFrame, ticker.name)}
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
        <CartesianGrid vertical={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={xTicks}
          tickFormatter={(v) => formatAxisDate(Number(v), timeFrame)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          orientation="right"
          tickFormatter={(v) => yTickFormatter(Number(v))}
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: "4 4" }}
          content={() => null}
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
        {stats && (
          <>
            <ReferenceLine
              y={stats.high}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={stats.low}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              strokeOpacity={0.5}
            />
            <ReferenceDot
              x={parseApiDatetime(stats.highPoint.datetime)}
              y={stats.high}
              r={4}
              fill="var(--color-rate)"
              stroke="var(--background)"
              strokeWidth={2}
            />
            <ReferenceDot
              x={parseApiDatetime(stats.lowPoint.datetime)}
              y={stats.low}
              r={4}
              fill="var(--color-rate)"
              stroke="var(--background)"
              strokeWidth={2}
            />
          </>
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
