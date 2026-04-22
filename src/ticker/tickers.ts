export type Ticker = {
  symbol: string;
  name: string;
  shortName: string;
};

// Curated list of liquid USDT pairs on Binance Spot. USDT trades close
// enough to USD that the currency formatter reads naturally.
export const TICKERS = [
  { symbol: "BTCUSDT", name: "Bitcoin", shortName: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", shortName: "ETH" },
  { symbol: "SOLUSDT", name: "Solana", shortName: "SOL" },
  { symbol: "BNBUSDT", name: "BNB", shortName: "BNB" },
  { symbol: "XRPUSDT", name: "XRP", shortName: "XRP" },
  { symbol: "ADAUSDT", name: "Cardano", shortName: "ADA" },
  { symbol: "AVAXUSDT", name: "Avalanche", shortName: "AVAX" },
  { symbol: "LINKUSDT", name: "Chainlink", shortName: "LINK" },
  { symbol: "DOGEUSDT", name: "Dogecoin", shortName: "DOGE" },
  { symbol: "LTCUSDT", name: "Litecoin", shortName: "LTC" },
] as const satisfies readonly Ticker[];

export type TickerSymbol = (typeof TICKERS)[number]["symbol"];

export const DEFAULT_SYMBOL: TickerSymbol = "BTCUSDT";

const BY_SYMBOL = new Map<string, Ticker>(TICKERS.map((t) => [t.symbol, t]));

export function findTicker(symbol: string): Ticker {
  return BY_SYMBOL.get(symbol) ?? TICKERS[0];
}

export function isKnownSymbol(symbol: string): symbol is TickerSymbol {
  return BY_SYMBOL.has(symbol);
}
