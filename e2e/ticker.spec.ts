import { expect, test } from "@playwright/test";
import { buildMonthSeries, mockBinanceApi } from "./fixtures";

// Deny-by-default fallbacks: any Binance REST or WS traffic that a test
// hasn't explicitly mocked is aborted. Playwright route order is LIFO,
// so the per-test handlers registered inside `mockBinanceApi` win.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/api\.binance\.com\//, async (route) => {
    console.error(
      `[e2e] unmocked Binance REST: ${route.request().method()} ${route.request().url()}`,
    );
    await route.abort("failed");
  });
  await page.routeWebSocket(/^wss:\/\/stream\.binance\.com/, (ws) => {
    console.error(`[e2e] unmocked Binance WS: ${ws.url()}`);
    ws.close();
  });
});

const DAY_BUNDLE = {
  currentMid: 71234.56,
  chartPrices: [
    { datetime: "2026-04-13T08:00:00.000000", rate: 70500 },
    { datetime: "2026-04-13T09:00:00.000000", rate: 72500 },
    { datetime: "2026-04-13T10:00:00.000000", rate: 69500 },
    { datetime: "2026-04-13T11:00:00.000000", rate: 71500 },
  ],
};

const WEEK_BUNDLE = {
  currentMid: 73000,
  chartPrices: buildMonthSeries(70000, 14),
};

test.describe("Ticker list", () => {
  test("renders a row per ticker with a live price", async ({ page }) => {
    await mockBinanceApi(page, { defaultBundle: DAY_BUNDLE });

    await page.goto("/");

    // A row per curated ticker is rendered.
    await expect(page.getByText("Bitcoin")).toBeVisible();
    await expect(page.getByText("Ethereum")).toBeVisible();
    await expect(page.getByText("Solana")).toBeVisible();

    // The kline WS push populates each row's priceAtom. With the shared
    // default bundle every row shows the same number, so scope the
    // assertion to the Bitcoin row.
    const btcRow = page.getByRole("button", { name: /Bitcoin/ });
    await expect(btcRow.getByText("$71,234.56")).toBeVisible();
  });

  test("expanding a row reveals its chart and timeframe selector", async ({
    page,
  }) => {
    await mockBinanceApi(page, { defaultBundle: DAY_BUNDLE });

    await page.goto("/");
    const btcRow = page.getByRole("button", { name: /Bitcoin/ });
    await expect(btcRow).toHaveAttribute("aria-expanded", "false");

    await btcRow.click();

    await expect(btcRow).toHaveAttribute("aria-expanded", "true");
    // The timeframe selector is only rendered inside the expanded panel.
    await expect(page.getByRole("tab", { name: "1D" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Bitcoin price chart/ }),
    ).toBeVisible();
  });

  test("changing the timeframe fetches klines with the new interval", async ({
    page,
  }) => {
    await mockBinanceApi(page, {
      bundles: { DAY: DAY_BUNDLE, WEEK: WEEK_BUNDLE },
      defaultBundle: DAY_BUNDLE,
    });

    // Start with BTC already expanded via the URL param.
    await page.goto("/?ticker=btcusdt");

    const weekRequest = page.waitForRequest((req) => {
      if (req.method() !== "GET") return false;
      let url: URL;
      try {
        url = new URL(req.url());
      } catch {
        return false;
      }
      return (
        url.hostname === "api.binance.com" &&
        url.pathname === "/api/v3/klines" &&
        url.searchParams.get("symbol") === "BTCUSDT" &&
        url.searchParams.get("interval") === "1h"
      );
    });

    await page.getByRole("tab", { name: "1W" }).click();
    await weekRequest;
  });

  test("shows the chart error state and recovers on retry", async ({
    page,
  }) => {
    // Fail the first 1h (WEEK) klines call so the sparklines (5m) load
    // cleanly but the big chart errors out when we switch to 1W.
    await mockBinanceApi(page, {
      bundles: { DAY: DAY_BUNDLE, WEEK: WEEK_BUNDLE },
      defaultBundle: DAY_BUNDLE,
      failChart: { WEEK: 1 },
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Bitcoin/ }).click();
    await page.getByRole("tab", { name: "1W" }).click();

    await expect(page.getByText("Couldn't load price data")).toBeVisible();

    await page.getByRole("button", { name: /try again/i }).click();

    await expect(page.getByText("Couldn't load price data")).not.toBeVisible();
    await expect(
      page.getByRole("img", { name: /Bitcoin price chart/ }),
    ).toBeVisible();
  });
});
