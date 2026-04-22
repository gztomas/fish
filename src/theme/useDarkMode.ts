import { useEffect, useState } from "react";

const STORAGE_KEY = "fish-theme";

export type ThemePreference = "light" | "dark" | "system";

function getInitialPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(
    STORAGE_KEY,
  ) as ThemePreference | null;
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkMode() {
  const [preference, setPreference] =
    useState<ThemePreference>(getInitialPreference);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark =
        preference === "dark" ||
        (preference === "system" && systemPrefersDark());
      root.classList.toggle("dark", isDark);
    };
    apply();
    window.localStorage.setItem(STORAGE_KEY, preference);

    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  return { preference, setPreference };
}
