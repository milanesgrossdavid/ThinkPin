"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const theme = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", theme === "dark");

    try {
      window.localStorage.setItem("thinkpin-theme", theme);
    } catch (error) {
      console.error("Could not save the theme preference.", error);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-elevated text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
    </button>
  );
}
