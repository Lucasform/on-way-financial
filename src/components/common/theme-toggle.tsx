"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type Theme = "dark" | "light";

const KEY = "onway-theme";

export function applyThemeImmediate() {
  if (typeof document === "undefined") return;
  try {
    const saved = (localStorage.getItem(KEY) as Theme | null) ?? "dark";
    if (saved === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  } catch {
    /* ignore */
  }
}

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "labeled" }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(KEY) as Theme | null)) || "dark";
    setTheme(saved);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Alternar tema" disabled>
        <Moon className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const Icon = theme === "dark" ? Sun : Moon;
  const label = theme === "dark" ? "Tema claro" : "Tema escuro";

  if (variant === "labeled") {
    return (
      <Button variant="outline" size="sm" onClick={toggle} aria-label={label}>
        <Icon className="h-4 w-4" /> {label}
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
