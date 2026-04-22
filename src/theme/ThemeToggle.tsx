import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { LaptopIcon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/ui/button";
import { useDarkMode, type ThemePreference } from "@/theme/useDarkMode";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: IconSvgElement;
}> = [
  { value: "light", label: "Light mode", icon: Sun03Icon },
  { value: "dark", label: "Dark mode", icon: Moon02Icon },
  { value: "system", label: "System theme", icon: LaptopIcon },
];

export function ThemeToggle() {
  const { preference, setPreference } = useDarkMode();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-1"
    >
      {OPTIONS.map(({ value, label, icon }) => {
        const selected = preference === value;
        return (
          <Button
            key={value}
            variant="ghost"
            size="icon"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setPreference(value)}
            className={
              selected ? "bg-accent text-accent-foreground" : undefined
            }
          >
            <HugeiconsIcon icon={icon} className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
