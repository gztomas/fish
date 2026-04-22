import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Refreshing is driven by refetchInterval per query; focus
      // refetches just cause surprise requests in tests and dev.
      refetchOnWindowFocus: false,
      networkMode: "always",
    },
  },
});

const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

// StrictMode is off under `vite --mode test` (Playwright's webServer).
// Its double-mount makes mount-time request counts flaky in e2e.
createRoot(document.getElementById("root")!).render(
  import.meta.env.MODE === "test" ? app : <StrictMode>{app}</StrictMode>,
);
