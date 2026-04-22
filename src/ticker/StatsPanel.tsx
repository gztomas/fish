import type { TimeFrame } from "@/api/types";
import { formatPercent, formatUsd, getPriceDecimals } from "@/ticker/format";
import type { ChartStats } from "@/ticker/stats";

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold tabular-nums text-foreground/75">
        {value}
      </span>
    </div>
  );
}

export function StatsPanel({
  stats,
  timeFrame,
}: {
  stats: ChartStats | null;
  timeFrame: TimeFrame;
}) {
  const range = stats ? stats.high - stats.low : null;
  // Peak-to-trough as a fraction of the low: a rough choppiness
  // signal for a 24/7 market. Not meaningful on ALL, where the low
  // is cents and the ratio explodes into the millions of percent.
  const volatility =
    stats && range !== null && stats.low > 0 ? range / stats.low : null;
  const volatilityValue =
    timeFrame === "ALL"
      ? "N/A"
      : volatility !== null
        ? formatPercent(volatility)
        : "—";
  const decimals = getPriceDecimals(stats?.low ?? 0);
  const fmt = (v: number) => formatUsd(v, decimals);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
      <StatItem label="High" value={stats ? fmt(stats.high) : "—"} />
      <StatItem label="Low" value={stats ? fmt(stats.low) : "—"} />
      <StatItem label="Range" value={range !== null ? fmt(range) : "—"} />
      <StatItem label="Volatility" value={volatilityValue} />
    </div>
  );
}
