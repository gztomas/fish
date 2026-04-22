import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { TICKERS, findTicker, type TickerSymbol } from "./tickers";

export function TickerSelector({
  value,
  onChange,
}: {
  value: TickerSymbol;
  onChange: (value: TickerSymbol) => void;
}) {
  const current = findTicker(value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TickerSymbol)}>
      <SelectTrigger aria-label="Select ticker" className="min-w-32">
        <SelectValue>
          <span className="flex items-baseline gap-2">
            <span className="font-semibold">{current.shortName}</span>
            <span className="text-xs text-muted-foreground">
              {current.name}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TICKERS.map((ticker) => (
          <SelectItem key={ticker.symbol} value={ticker.symbol}>
            <span className="flex items-baseline gap-2">
              <span className="font-semibold w-12">{ticker.shortName}</span>
              <span className="text-xs text-muted-foreground">
                {ticker.name}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
