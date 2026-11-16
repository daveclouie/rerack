"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";

type Theme = "cream" | "dark";
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "rerack-theme";
const THEME_CHANGE_EVENT = "rerack-theme-change";
let fallbackTheme: Theme = "cream";

function getStoredTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "cream") return saved;
  } catch (error) {
    console.warn("Theme preference could not be loaded.", error);
  }
  return fallbackTheme;
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function getServerTheme(): Theme {
  return "cream";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = getStoredTheme() === "cream" ? "dark" : "cream";
    fallbackTheme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider.");
  return value;
}
