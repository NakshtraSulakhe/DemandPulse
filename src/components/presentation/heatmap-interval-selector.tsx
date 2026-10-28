"use client";

import React from "react";
import { Clock } from "lucide-react";

export const HEATMAP_INTERVAL_OPTIONS = [
  { value: 5, label: "5m", slots: 108, description: "5-minute slots (108 intervals)" },
  { value: 10, label: "10m", slots: 54, description: "10-minute slots (54 intervals)" },
  { value: 15, label: "15m", slots: 36, description: "15-minute slots (36 intervals)" },
  { value: 30, label: "30m", slots: 18, description: "30-minute slots (Default, 18 intervals)" },
  { value: 60, label: "60m", slots: 9, description: "60-minute / 1-hour slots (9 intervals)" },
];

interface HeatmapIntervalSelectorProps {
  value: number;
  onChange: (interval: number) => void;
  compact?: boolean;
  className?: string;
}

export default function HeatmapIntervalSelector({
  value = 30,
  onChange,
  compact = false,
  className = "",
}: HeatmapIntervalSelectorProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 shadow-inner ${className}`}
    >
      <div className="flex items-center gap-1 pl-1.5 pr-1 text-slate-500 dark:text-slate-400 select-none">
        <Clock className={compact ? "w-3 h-3 text-cyan-500" : "w-3.5 h-3.5 text-cyan-500"} />
        {!compact && (
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-wide uppercase">
            Interval:
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {HEATMAP_INTERVAL_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.description}
              className={`rounded-lg font-semibold transition-all duration-150 cursor-pointer ${
                compact
                  ? "px-2 py-1 text-[10px]"
                  : "px-2.5 py-1 text-xs"
              } ${
                isActive
                  ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30 font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
