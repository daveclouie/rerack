"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-control">
      <label className="sr-only" htmlFor="theme-preference">Appearance preference</label>
      <select id="theme-preference" className="theme-preference" value={theme} onChange={(event) => setTheme(event.target.value as "cream" | "dark" | "system")}>
        <option value="system">System</option><option value="cream">Cream</option><option value="dark">Dark</option>
      </select>
    </div>
  );
}
