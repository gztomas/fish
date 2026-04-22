import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

import type { ChartPrice } from "@/api/types";

export function Sparkline({
  points,
  color,
  className,
}: {
  points: ChartPrice[] | null;
  color: string;
  className?: string;
}) {
  if (!points || points.length < 2) {
    return <div className={className} aria-hidden="true" />;
  }
  // Points arrive newest-first; Recharts wants chronological.
  const data = new Array<{ rate: number }>(points.length);
  for (let i = 0; i < points.length; i++) {
    data[i] = { rate: Number(points[points.length - 1 - i].rate) };
  }

  return (
    <div className={className} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
        >
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
