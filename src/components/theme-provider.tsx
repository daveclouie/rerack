"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";

type Theme = "cream" | "dark" | "system";
type ResolvedTheme = "cream" | "dark";
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "rerack-theme";
const THEME_CHANGE_EVENT = "rerack-theme-change";
let fallbackTheme: Theme = "cream";

function getStoredTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "cream" || saved === "system") return saved;
  } catch (error) {
    console.warn("Theme preference could not be loaded.", error);
  }
  return fallbackTheme;
}

function getResolvedTheme(preference: Theme): ResolvedTheme {
  return preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "cream"
    : preference;
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

function getServerTheme(): Theme {
  return "cream";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const resolved = getResolvedTheme(theme);
      root.dataset.theme = resolved;
      root.dataset.themePreference = theme;
    };
    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    fallbackTheme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider.");
  return value;
}
