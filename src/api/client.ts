import { PriceApiError } from "./errors";

// Binance public REST root. These endpoints require no auth and allow
// CORS, so the browser can call them directly and we don't need a dev
// proxy or any env configuration.
const API_BASE = "https://api.binance.com";
const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchJson<T>(
  path: string,
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) query.set(k, String(v));
  const url = `${API_BASE}${path}?${query.toString()}`;

  // Compose the caller's signal with a timeout so a hung upstream
  // doesn't stall the query forever.
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  });

  if (!response.ok) {
    throw new PriceApiError(
      `Binance API returned ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
