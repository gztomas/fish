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

// yPad is 5% on each side, so the min/max lines sit at 0.05/1.1 of the plot
// height from the top and bottom edges.
const CURSOR_INSET_RATIO = 0.05 / 1.1;

function ClampedCursor({
  points,
}: {
  points?: Array<{ x: number; y: number }>;
}) {
  if (!points || points.length < 2) return null;
  const [top, bottom] = points;
  const inset = (bottom.y - top.y) * CURSOR_INSET_RATIO;
  return (
    <line
      x1={top.x}
      x2={top.x}
      y1={top.y + inset}
      y2={bottom.y - inset}
      stroke="var(--foreground)"
      strokeOpacity={0.7}
      strokeWidth={1}
    />
  );
}

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
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground sm:h-52">
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
  // 5% padding on each side so the min/max reference lines sit just
  // inside the plot edges instead of being flush.
  const yPad = (maxRate - minRate) * 0.05 || 1;
  const yDomain: [number, number] = [minRate - yPad, maxRate + yPad];

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-40 w-full sm:h-52"
      role="img"
      aria-label={buildChartAriaLabel(timeFrame, ticker.name)}
      initialDimension={{ width: 800, height: 320 }}
    >
      <AreaChart
        data={data}
        margin={{ top: 16, right: 0, left: 0, bottom: 16 }}
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
        <YAxis domain={yDomain} hide />
        <ChartTooltip cursor={<ClampedCursor />} content={() => null} />
        <ReferenceLine
          y={maxRate}
          stroke="var(--muted-foreground)"
          strokeDasharray="2 4"
          strokeOpacity={0.5}
          label={{
            value: format(maxRate),
            position: "insideBottomLeft",
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
            position: "insideTopLeft",
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
