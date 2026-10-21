"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { Sun, Moon, Sparkles } from "lucide-react";

interface ThemeToggleProps {
  variant?: "icon" | "pill" | "segmented";
  className?: string;
  showTooltip?: boolean;
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
  showTooltip = true,
}: ThemeToggleProps) {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch before client mount
    return (
      <div
        className={`w-9 h-9 rounded-xl bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300/40 dark:border-white/10 ${className}`}
      />
    );
  }

  if (variant === "segmented") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/70 dark:border-white/10 shadow-inner ${className}`}
        role="group"
        aria-label="Theme selection"
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !isDark
              ? "bg-white text-amber-600 shadow-md border border-amber-500/20"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Switch to Light Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isDark
              ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-400/30"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          title="Switch to Dark Mode"
        >
          <Moon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${
          isDark
            ? "bg-slate-900/80 hover:bg-slate-800 border-white/10 text-cyan-300 hover:border-cyan-500/40"
            : "bg-white hover:bg-slate-50 border-slate-300/80 text-amber-600 hover:border-amber-400/50 shadow-slate-200"
        } ${className}`}
        title={isDark ? "Switch to Daylight View" : "Switch to Command Center Dark"}
      >
        {isDark ? (
          <>
            <Moon className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-slate-200">Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-slate-800">Light Mode</span>
          </>
        )}
      </button>
    );
  }

  // Default "icon" variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl transition-all border flex items-center justify-center group overflow-hidden ${
        isDark
          ? "bg-slate-900/90 border-slate-700/80 text-cyan-400 hover:border-cyan-400/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-cyan-500/10"
          : "bg-white/95 border-slate-300/90 text-amber-500 hover:border-amber-400/60 hover:bg-amber-50/50 hover:shadow-lg hover:shadow-amber-500/10 shadow-sm"
      } ${className}`}
      title={isDark ? "Switch to Light Mode (Daylight Report)" : "Switch to Dark Mode (Command Center)"}
      aria-label={isDark ? "Activate light theme" : "Activate dark theme"}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-cyan-400 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-500 group-hover:rotate-45 group-hover:scale-110" />
        )}
      </div>

      {showTooltip && (
        <span className="sr-only">
          {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </span>
      )}
    </button>
  );
}
