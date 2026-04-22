import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";

import { TickerList } from "@/ticker/TickerList";
import { ThemeToggle } from "@/theme/ThemeToggle";
import { Button } from "@/ui/button";

export default function App() {
  return (
    <div
      className="min-h-full bg-background text-foreground"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 110% 90% at 100% 100%, color-mix(in oklch, var(--primary) 28%, transparent), transparent 70%)",
      }}
    >
      <header className="w-full border-b bg-card">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" aria-hidden="true">
              🐟
            </span>
            <span className="text-2xl font-bold tracking-tight">fish</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/gztomas/fish"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
              >
                <HugeiconsIcon icon={GithubIcon} className="size-4" />
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-8 py-8">
        <TickerList />
      </main>
    </div>
  );
}
