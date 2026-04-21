# 🐟 fish

Live crypto prices and price history for a curated set of tickers.
Sub-second updates streamed over WebSocket, interactive chart, zero
sign-up. Powered by the public Binance APIs.

## Features

- Ticker selector across 10 liquid USDT pairs
  (BTC, ETH, SOL, BNB, XRP, ADA, AVAX, LINK, DOGE, LTC)
- Live price streamed over WebSocket with connection-aware refreshing
  and offline indicators
- Time frame tabs (1D / 1W / 1M / 1Y / ALL) for the chart
- Area chart with high / low markers, hover detail, and a click-drag
  brush to measure the change between any two points
- High / Low / Range / Volatility stats for the active window
- Light and dark theme

## Running

```bash
pnpm install
pnpm dev             # http://localhost:5173
pnpm build           # type-check and build for production
pnpm test            # run unit + e2e suites
```

Playwright needs its browser downloaded once before `pnpm test`:

```bash
pnpm exec playwright install chromium
```

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, Radix primitives, and
Recharts for the chart. State lives in Jotai atoms, WebSocket messages
are validated with Zod at the network boundary, and the stream
connection is handled by partysocket.
