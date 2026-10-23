"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark mode for TV command center aesthetics
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from database preferences on mount (with automatic one-time cleanup of legacy localStorage)
  useEffect(() => {
    let active = true;

    async function loadThemeFromDatabase() {
      try {
        // 1. One-time check for legacy localStorage key to migrate and permanently delete
        let legacyTheme: string | null = null;
        try {
          legacyTheme = localStorage.getItem("demandflow-theme") || localStorage.getItem("theme");
          if (legacyTheme) {
            localStorage.removeItem("demandflow-theme");
            localStorage.removeItem("theme");
          }
        } catch {}

        // 2. Fetch authoritative preference from MySQL database
        const res = await fetch("/api/slides/preferences");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.theme) {
            const dbTheme: Theme = json.data.theme === "light" ? "light" : "dark";
            if (active) {
              setThemeState(dbTheme);
              applyThemeClass(dbTheme);
            }
            return;
          }
        }

        // 3. If legacy theme was found and DB was default, persist legacy preference to DB once
        if (legacyTheme === "light" || legacyTheme === "dark") {
          const t = legacyTheme as Theme;
          if (active) {
            setThemeState(t);
            applyThemeClass(t);
          }
          fetch("/api/slides/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ theme: t }),
          }).catch(() => {});
          return;
        }

        // Default to dark mode
        if (active) applyThemeClass("dark");
      } catch {
        if (active) applyThemeClass("dark");
      } finally {
        if (active) setMounted(true);
      }
    }

    loadThemeFromDatabase();

    return () => {
      active = false;
    };
  }, []);

  const applyThemeClass = (newTheme: Theme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    }

    // Dispatch a custom event so non-React widgets update if needed
    window.dispatchEvent(new CustomEvent("demandflow-theme-change", { detail: { theme: newTheme } }));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClass(newTheme);

    // Persist to MySQL database (zero localStorage)
    fetch("/api/slides/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch((err) => console.error("Failed to save theme to MySQL database:", err));
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
