import { useState } from "react";

import { cn } from "@/ui/cn";

import type { Ticker } from "./tickers";

// Served from jsDelivr's mirror of the `cryptocurrency-icons` npm
// package: filenames are the lowercase short name (btc.svg, eth.svg…).
const ICON_BASE =
  "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

export function CoinIcon({
  ticker,
  className,
}: {
  ticker: Ticker;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[10px] font-semibold text-white",
          className,
        )}
        style={{ backgroundColor: ticker.color }}
        aria-hidden="true"
      >
        {ticker.shortName.slice(0, 3)}
      </span>
    );
  }
  return (
    <img
      src={`${ICON_BASE}/${ticker.shortName.toLowerCase()}.svg`}
      alt=""
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}
