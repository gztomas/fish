// Formatter cache keyed by fraction digits so we don't rebuild an
// Intl.NumberFormat on every render.
const USD_FORMATTERS = new Map<number, Intl.NumberFormat>();

function usdFormatter(decimals: number): Intl.NumberFormat {
  let fmt = USD_FORMATTERS.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    USD_FORMATTERS.set(decimals, fmt);
  }
  return fmt;
}

export const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export const percentUnsignedFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Picks a sensible number of fraction digits for a price given a
 * reference magnitude. Prices ≥ $1 use the usual 2 decimals; sub-dollar
 * prices (DOGE, ADA, SHIB) bump up so the first ~4 significant digits
 * still show. Callers should pass ONE reference per view (e.g.
 * `stats.low` for the stats panel) so every number in that view lines
 * up with the same precision.
 */
export function getPriceDecimals(reference: number): number {
  const abs = Math.abs(reference);
  if (!Number.isFinite(abs) || abs === 0 || abs >= 1) return 2;
  const leadingZeros = -Math.floor(Math.log10(abs)) - 1;
  return Math.min(8, 2 + leadingZeros + 1);
}

export function formatUsd(value: number, decimals = 2): string {
  return usdFormatter(decimals).format(value);
}

export function formatPercentChange(ratio: number): string {
  return percentFormatter.format(ratio);
}

export function formatPercent(ratio: number): string {
  return percentUnsignedFormatter.format(ratio);
}

export function formatTooltipDate(
  timestamp: number,
  timeFrame: string,
): string {
  const date = new Date(timestamp);
  if (timeFrame === "LIVE") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (timeFrame === "DAY" || timeFrame === "WEEK") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
