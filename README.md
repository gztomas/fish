# <img src="public/logo.svg" alt="" height="24" valign="middle" /> fish

A small React app that shows a live crypto price and a price chart over
user-selected time frames, for a curated set of tickers, backed by the
public Binance REST API.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 with shadcn UI primitives, including the shadcn chart
  component (Recharts under the hood)
- d3 utilities (`d3-array`, `d3-scale`, `d3-format`) for the viz math
- TanStack Query for data fetching, caching, and refetch intervals
- Vitest for unit tests, Playwright for end-to-end tests

## Running

```bash
pnpm install
pnpm exec playwright install chromium   # once, for e2e tests
pnpm dev             # http://localhost:5173

pnpm test            # run unit + e2e suites
pnpm test:unit       # vitest only
pnpm test:e2e        # playwright only

pnpm build           # type-check and build for production
```

### API

The app talks to the public Binance REST API directly from the browser.
Both endpoints require no auth and allow CORS, so there is no dev proxy
and no `.env` configuration. `src/api/client.ts` is a thin typed wrapper
around `fetch` with a 15 s timeout, and `src/api/queries.ts` normalizes
the two upstream shapes into the `Price` / `ChartPrice` objects the rest
of the app consumes.

| Endpoint                                  | Used for                             |
| ----------------------------------------- | ------------------------------------ |
| `GET /api/v3/ticker/price?symbol=BTCUSDT` | Live 5 s price tick in the header    |
| `GET /api/v3/klines?symbol=BTCUSDT&…`     | Chart series per selected time frame |

## Features

- Ticker selector across a curated list of liquid USDT pairs
  (BTC, ETH, SOL, BNB, XRP, ADA, AVAX, LINK, DOGE, LTC)
- Live price with a refreshing indicator and a stale marker when polls
  have been missed
- Time frame tabs (1D / 1W / 1M / 1Y / ALL) driving the chart query
- Area chart with high/low markers and dashed reference lines
- Hover detail in the header showing the price and time at the cursor
- Click-and-drag brush to measure the change between any two points
- High / Low / Range / Volatility stats for the active time frame
- Percent and absolute change for the selected window
- Auto-refresh tied to the selected time frame, paused while the tab
  is hidden
- Error state with a retry button that refetches both the price and
  the chart
- Light and dark theme toggle

## Tests

Unit tests run in vitest against pure logic only, no DOM:

- `ticker/stats.test.ts`: high / low / first / last / change math
- `ticker/format.test.ts`: currency and percent formatting

End-to-end tests run in Playwright against the real dev server. Playwright
boots Vite with `--mode test` (see `playwright.config.ts`) so StrictMode's
dev-only double-mount is off and mount-time request counts are stable.
Each spec uses `page.route(/api\.binance\.com/, ...)` to fulfill the
Binance endpoints with fixture data per time frame and to simulate
transient 500s for the retry flow. An unmocked Binance request is denied
by default in `test.beforeEach`, so the real API is never hit from a
test run. See `e2e/fixtures.ts` for the helper.

- Renders current price and High / Low / Range / Volatility stats from a mocked response
- Switches time frames and verifies the outgoing klines request carries
  the expected `interval` query parameter
- Forces a failure, asserts the error state, clicks retry, and recovers

## Decisions

A few choices worth noting if you're reviewing the code.

**Layout is by feature, not by file type.** There's no top-level
`components/`, `hooks/`, or `lib/` bucket. Each folder under `src/` is
either a product slice (`api`, `ticker`, `theme`) or shared
infrastructure (`ui`). The principle is that **files that change
together are kept close**: adding a stat to the ticker header touches
the stats helper, the formatter, and the component in one session, and
they all live in the same folder, so the change is one short diff
instead of three unrelated ones. Something gets promoted to `src/ui/`
only once two features genuinely share it.

**One normalized type at the API boundary, parsed where consumed.**
`src/api/types.ts` is the single source of truth. `src/api/queries.ts`
adapts Binance's kline tuples and ticker payloads into `Price` /
`ChartPrice` objects with ISO-8601 datetimes and decimal strings for
`rate` / `mid`; the rest of the app sees exactly that one shape. There
is no second "normalized" variant carried alongside, and parsing a
string into a number is cheap and happens where the value is consumed
(chart, stats, header).

**The React Compiler is on** (via `babel-plugin-react-compiler`). No
manual `useMemo`, `useCallback`, or `React.memo`: the compiler
auto-memoizes and the plain expression stays readable.

**Tailwind theme tokens over arbitrary values.** No `text-[10px]` or
`p-[13px]` when `text-xs` or `p-3` already exists. If a value genuinely
needs to live outside the theme, it gets added to `src/index.css` so
the new token is reusable rather than scattered across components as
one-offs.
