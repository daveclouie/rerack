"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-switch" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "cream" ? "dark" : "cream"} theme`}>
      {theme === "cream" ? "Cream theme" : "Dark theme"}
    </button>
  );
}
