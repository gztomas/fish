import { PriceCard } from "@/ticker/PriceCard";
import { ThemeToggle } from "@/theme/ThemeToggle";

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
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-8 py-8">
        <PriceCard />
      </main>
    </div>
  );
}
