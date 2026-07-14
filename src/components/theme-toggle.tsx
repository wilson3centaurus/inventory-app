'use client';

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("stockflow-theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("stockflow-theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  const toggle = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("stockflow-theme", nextTheme);
    window.dispatchEvent(new Event("stockflow-theme-change"));
  };

  return (
    <button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`theme-toggle grid size-10 place-items-center rounded-[14px] border border-border bg-surface text-brand-text shadow-sm ${className}`}
      onClick={toggle}
      type="button"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
