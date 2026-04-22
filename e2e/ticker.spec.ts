import { expect, test } from "@playwright/test";
import { buildMonthSeries, mockBinanceApi } from "./fixtures";

// Deny-by-default fallback: any Binance request not explicitly mocked
// by the test is aborted. Playwright's route order is LIFO, so the
// per-test mock still wins.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/api\.binance\.com\//, async (route) => {
    console.error(
      `[e2e] unmocked Binance request: ${route.request().method()} ${route.request().url()}`,
    );
    await route.abort("failed");
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

test.describe("BTC price card", () => {
  test("renders current price and stats from the API", async ({ page }) => {
    await mockBinanceApi(page, { defaultBundle: DAY_BUNDLE });

    await page.goto("/");

    await expect(page.getByText("$71,234.56")).toBeVisible();

    // High, Low, Range, and Volatility all appear in the stats panel.
    await expect(page.getByText("$72,500.00")).toBeVisible();
    await expect(page.getByText("$69,500.00")).toBeVisible();
    await expect(page.getByText("$3,000.00")).toBeVisible();
    await expect(page.getByText("4.32%")).toBeVisible();
    await expect(page.getByLabel("Live")).toBeVisible();
  });

  test("sends a klines request with the selected interval when switching tabs", async ({
    page,
  }) => {
    await mockBinanceApi(page, {
      bundles: { DAY: DAY_BUNDLE, WEEK: WEEK_BUNDLE },
      defaultBundle: DAY_BUNDLE,
    });

    const weekChartRequestPromise = page.waitForRequest((req) => {
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
        url.searchParams.get("interval") === "1h"
      );
    });

    await page.goto("/");
    await expect(page.getByText("$71,234.56")).toBeVisible();

    await page.getByRole("tab", { name: "1W" }).click();
    const req = await weekChartRequestPromise;
    expect(req).toBeTruthy();
  });

  test("switches ticker and sends klines requests with the new symbol", async ({
    page,
  }) => {
    const ETH_BUNDLE = {
      currentMid: 2500.25,
      chartPrices: [
        { datetime: "2026-04-13T08:00:00.000000", rate: 2480 },
        { datetime: "2026-04-13T09:00:00.000000", rate: 2520 },
        { datetime: "2026-04-13T10:00:00.000000", rate: 2510 },
        { datetime: "2026-04-13T11:00:00.000000", rate: 2500 },
      ],
    };

    await mockBinanceApi(page, {
      defaultBundle: DAY_BUNDLE,
      bySymbol: { ETHUSDT: ETH_BUNDLE },
    });

    const ethKlinesRequest = page.waitForRequest((req) => {
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
        url.searchParams.get("symbol") === "ETHUSDT"
      );
    });

    await page.goto("/");
    await expect(page.getByText("$71,234.56")).toBeVisible();

    await page.getByLabel("Select ticker").click();
    await page.getByRole("option", { name: /Ethereum/ }).click();

    await ethKlinesRequest;
    await expect(page.getByText("$2,500.25")).toBeVisible();
  });

  test("shows an error state for the chart and recovers on retry", async ({
    page,
  }) => {
    // Fail the first klines request, then let the retry succeed.
    await mockBinanceApi(page, {
      defaultBundle: DAY_BUNDLE,
      failChart: { DAY: 1 },
    });

    await page.goto("/");

    await expect(page.getByText("$71,234.56")).toBeVisible();
    await expect(page.getByText("Couldn't load price data")).toBeVisible();

    await page.getByRole("button", { name: /try again/i }).click();

    await expect(page.getByText("Couldn't load price data")).not.toBeVisible();
    // Match on the low so we pin the assertion to the stats panel
    // rather than whatever the chart tooltip happens to be hovering.
    await expect(page.getByText("$69,500.00")).toBeVisible();
  });
});
