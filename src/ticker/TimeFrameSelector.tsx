import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import type { TimeFrame } from "@/api/types";

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
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
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as TimeFrame)}
      aria-label="Select chart time frame"
    >
      <TabsList>
        {TIME_FRAMES.map((frame) => (
          <TabsTrigger key={frame.value} value={frame.value}>
            {frame.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
