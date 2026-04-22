import type { TimeFrame } from "@/api/types";
import { cn } from "@/ui/cn";

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: "LIVE", label: "LIVE" },
  { value: "DAY", label: "1D" },
  { value: "WEEK", label: "1W" },
  { value: "MONTH", label: "1M" },
  { value: "YEAR", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

export function TimeFrameSelector({
  value,
  onChange,
}: {
  value: TimeFrame;
  onChange: (value: TimeFrame) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Chart time frame"
      className="flex w-full items-center justify-between gap-1"
    >
      {TIME_FRAMES.map((frame) => {
        const active = frame.value === value;
        return (
          <button
            key={frame.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(frame.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {frame.value === "LIVE" && (
              <span
                className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500"
                aria-hidden="true"
              />
            )}
            {frame.label}
          </button>
        );
      })}
    </div>
  );
}
