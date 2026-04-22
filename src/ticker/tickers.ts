export type Ticker = {
  symbol: string;
  name: string;
  shortName: string;
  color: string;
};

// Curated list of liquid USDT pairs on Binance Spot. USDT trades close
// enough to USD that the currency formatter reads naturally. `color` is
// the coin's brand hex, used as the chart's accent.
export const TICKERS = [
  { symbol: "BTCUSDT", name: "Bitcoin", shortName: "BTC", color: "#F7931A" },
  { symbol: "ETHUSDT", name: "Ethereum", shortName: "ETH", color: "#627EEA" },
  { symbol: "SOLUSDT", name: "Solana", shortName: "SOL", color: "#9945FF" },
  { symbol: "BNBUSDT", name: "BNB", shortName: "BNB", color: "#F3BA2F" },
  { symbol: "XRPUSDT", name: "XRP", shortName: "XRP", color: "#00AAE4" },
  { symbol: "ADAUSDT", name: "Cardano", shortName: "ADA", color: "#0033AD" },
  {
    symbol: "AVAXUSDT",
    name: "Avalanche",
    shortName: "AVAX",
    color: "#E84142",
  },
  {
    symbol: "LINKUSDT",
    name: "Chainlink",
    shortName: "LINK",
    color: "#2A5ADA",
  },
  { symbol: "DOGEUSDT", name: "Dogecoin", shortName: "DOGE", color: "#C2A633" },
  { symbol: "LTCUSDT", name: "Litecoin", shortName: "LTC", color: "#345D9D" },
] as const satisfies readonly Ticker[];

// Literal-typed view of TICKERS entries; use it instead of `Ticker`
// when the symbol needs to flow into APIs that expect `TickerSymbol`
// (e.g. atomFamily keys).
export type KnownTicker = (typeof TICKERS)[number];
export type TickerSymbol = KnownTicker["symbol"];

export const DEFAULT_SYMBOL: TickerSymbol = "BTCUSDT";

const BY_SYMBOL = new Map<string, Ticker>(TICKERS.map((t) => [t.symbol, t]));

export function findTicker(symbol: string): Ticker {
  return BY_SYMBOL.get(symbol) ?? TICKERS[0];
}

export function isKnownSymbol(symbol: string): symbol is TickerSymbol {
  return BY_SYMBOL.has(symbol);
}
