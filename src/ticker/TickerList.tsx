import { useEffect, useRef } from "react";

import { useStreamSync } from "@/api/useStreamSync";

import { TickerRow } from "./TickerRow";
import { TICKERS } from "./tickers";

const PROXIMITY_PX = 100;

export function TickerList() {
  useStreamSync();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;

    const apply = () => {
      raf = 0;
      const rows = el.querySelectorAll<HTMLElement>("[data-ticker-row]");
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const dx = pointerX - rect.left;
        const dy = pointerY - rect.bottom;
        const proximity = Math.max(0, 1 - Math.abs(dy) / PROXIMITY_PX);
        row.style.setProperty("--pointer-x", `${dx}px`);
        row.style.setProperty("--pointer-proximity", proximity.toFixed(3));
      });
    };

    const onMove = (e: PointerEvent) => {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      el.querySelectorAll<HTMLElement>("[data-ticker-row]").forEach((row) => {
        row.style.setProperty("--pointer-proximity", "0");
      });
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="w-full">
      {TICKERS.map((ticker) => (
        <TickerRow key={ticker.symbol} ticker={ticker} />
      ))}
    </div>
  );
}
