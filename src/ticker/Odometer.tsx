import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/ui/cn";

type Direction = "up" | "down" | null;

/**
 * Renders a numeric ticker with a per-digit odometer animation: each
 * digit is a clipped column of 0-9 that slides vertically on change,
 * and changed digits briefly flash up/down color.
 *
 * The caller supplies `format` so the component stays agnostic to
 * currency, units, or locale.
 */
export function Odometer({
  value,
  format,
  placeholder = "—",
  className,
}: {
  value: number | null;
  format: (value: number) => string;
  placeholder?: ReactNode;
  className?: string;
}) {
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [direction, setDirection] = useState<Direction>(null);

  // See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (value !== prevValue) {
    setPrevValue(value);
    setDirection(
      value != null && prevValue != null
        ? value > prevValue
          ? "up"
          : "down"
        : null,
    );
  }

  if (value == null) {
    return (
      <span className={cn("tabular-nums select-none", className)}>
        {placeholder}
      </span>
    );
  }

  const text = format(value);
  return (
    <span
      className={cn(
        "inline-flex items-baseline tabular-nums select-none",
        className,
      )}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex items-baseline">
        {[...text].map((char, i) => (
          <Char key={i} char={char} direction={direction} />
        ))}
      </span>
    </span>
  );
}

function Char({ char, direction }: { char: string; direction: Direction }) {
  const [prev, setPrev] = useState(char);
  const [flash, setFlash] = useState<Direction>(null);

  if (char !== prev) {
    setPrev(char);
    setFlash(direction);
  }

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 700);
    return () => window.clearTimeout(id);
  }, [flash]);

  if (!/\d/.test(char)) {
    return <span>{char}</span>;
  }

  const digit = Number(char);
  return (
    <span
      className="relative inline-block overflow-hidden align-baseline"
      style={{ height: "1em" }}
    >
      {/* Invisible spacer gives the cell a tabular width and a text
          baseline; the animated column is absolutely positioned over it. */}
      <span className="invisible">0</span>
      <span
        className={cn(
          "absolute inset-x-0 top-0 flex flex-col transition-[transform,color] duration-500 ease-out",
          flash === "up" && "text-chart-up",
          flash === "down" && "text-chart-down",
        )}
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="block" style={{ height: "1em" }}>
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}
