"use client";

import React, { useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight, RotateCcw, Clock } from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface SlideDateFilterProps {
  selectedDate?: string; // YYYY-MM-DD or undefined (meaning today/live)
  onDateChange: (date: string | undefined) => void;
  compact?: boolean;
  className?: string;
  showApplyToAll?: boolean;
  onApplyToAll?: (date: string) => void;
}

export default function SlideDateFilter({
  selectedDate,
  onDateChange,
  compact = false,
  className = "",
  showApplyToAll = false,
  onApplyToAll,
}: SlideDateFilterProps) {
  // Authoritative today shift date (YYYY-MM-DD)
  const todayDate = useMemo(() => getShiftBusinessDate(), []);
  
  // Calculate yesterday date
  const yesterdayDate = useMemo(() => {
    const [y, m, d] = todayDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    return dt.toISOString().split("T")[0];
  }, [todayDate]);

  const activeDate = selectedDate || todayDate;
  const isToday = activeDate === todayDate;
  const isYesterday = activeDate === yesterdayDate;
  const isHistorical = !isToday;

  const handlePrevDay = () => {
    const [y, m, d] = activeDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    onDateChange(dt.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    if (isToday) return;
    const [y, m, d] = activeDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
    const nextStr = dt.toISOString().split("T")[0];
    if (nextStr >= todayDate) {
      onDateChange(undefined); // Reset to today
    } else {
      onDateChange(nextStr);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val || val === todayDate) {
      onDateChange(undefined);
    } else {
      onDateChange(val);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Date Pill & Calendar Input */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all ${
          isHistorical
            ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200 shadow-sm"
            : "bg-slate-100 dark:bg-slate-900/80 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300"
        }`}
      >
        <Calendar
          className={`w-3.5 h-3.5 ${
            isHistorical ? "text-amber-500 animate-pulse" : "text-cyan-500"
          }`}
        />

        {/* Previous Day Button */}
        <button
          onClick={handlePrevDay}
          title="Previous day"
          className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>

        {/* Date Input */}
        <div className="relative flex items-center">
          <input
            type="date"
            value={activeDate}
            max={todayDate}
            onChange={handleInputChange}
            className="bg-transparent font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer text-center"
            title="Filter by shift date (YYYY-MM-DD)"
          />
        </div>

        {/* Next Day Button */}
        <button
          onClick={handleNextDay}
          disabled={isToday}
          title={isToday ? "Cannot go past today" : "Next day"}
          className={`p-0.5 rounded transition-colors ${
            isToday
              ? "opacity-30 cursor-not-allowed text-slate-400"
              : "hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          }`}
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Preset Buttons */}
      {!compact && (
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-950/70 border border-slate-300/80 dark:border-white/10 text-[10.5px]">
          <button
            onClick={() => onDateChange(undefined)}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              isToday
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Switch to Today (Live Data)"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isToday ? "bg-slate-950 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span>Today</span>
          </button>

          <button
            onClick={() => onDateChange(yesterdayDate)}
            className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
              isYesterday
                ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title={`View yesterday's shift (${yesterdayDate})`}
          >
            Yesterday
          </button>
        </div>
      )}

      {/* Historical Status Badge with Reset Button */}
      {isHistorical && (
        <div className="flex items-center gap-1">
          <span className="hidden xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-2.5 h-2.5" /> Backdated Snapshot
          </span>
          <button
            onClick={() => onDateChange(undefined)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition-colors cursor-pointer"
            title="Reset to Live Shift Data"
          >
            <RotateCcw className="w-2.5 h-2.5 text-cyan-500" />
            <span>Reset</span>
          </button>
          {showApplyToAll && onApplyToAll && (
            <button
              onClick={() => onApplyToAll(activeDate)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
              title={`Apply ${activeDate} to all 5 dashboard slides`}
            >
              <span>Apply All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
