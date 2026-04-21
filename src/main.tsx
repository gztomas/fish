import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

// StrictMode is off under `vite --mode test` (Playwright's webServer).
// Its double-mount makes mount-time request counts flaky in e2e.
createRoot(document.getElementById("root")!).render(
  import.meta.env.MODE === "test" ? (
    <App />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  ),
);
