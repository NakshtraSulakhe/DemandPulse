"use client";

import React, { useState } from "react";
import { RecognitionData, RecognitionTickerItem } from "@/types";
import {
  Trophy,
  Cake,
  Award,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface RecognitionScrollerProps {
  data?: RecognitionData;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  variant?: "marquee" | "slider" | "compact";
  speed?: "slow" | "normal" | "fast";
}

export default function RecognitionScroller({
  data,
  isLoading = false,
  error = null,
  onRetry,
  variant: initialVariant = "marquee",
  speed = "normal",
}: RecognitionScrollerProps) {
  const [displayMode, setDisplayMode] = useState<"marquee" | "slider">(
    initialVariant === "slider" ? "slider" : "marquee"
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "top_lead_scorer" | "birthday" | "anniversary"
  >("all");
  const [sliderIndex, setSliderIndex] = useState<number>(0);

  const rawItems = (data?.ticker_items || []).filter((item) => {
    if (item.type === "top_lead_scorer") {
      // Strictly only display agents who actually achieved their daily target & have positive incentive!
      const target = Number(item.target_points);
      const achieved = Number(item.achieved_points ?? item.score);
      const amount = Number(item.incentive_amount);
      if (!Number.isFinite(target) || target <= 0) return false;
      if (!Number.isFinite(achieved) || achieved < target) return false;
      if (!Number.isFinite(amount) || amount <= 0) return false;
      if (item.is_target_met === false) return false;
      if (item.completion_percentage != null && item.completion_percentage < 100) return false;
      if (item.eligibility_status && item.eligibility_status !== "eligible") return false;
      return true;
    }
    // Authentic celebratory events (birthdays & anniversaries)
    if (item.type === "birthday" || item.type === "anniversary") {
      return true;
    }
    return false;
  });

  const topScorersCount = rawItems.filter((i) => i.type === "top_lead_scorer").length;
  const birthdaysCount = rawItems.filter((i) => i.type === "birthday").length;
  const anniversariesCount = rawItems.filter((i) => i.type === "anniversary").length;

  // Fall back to "all" if active category has 0 items
  const effectiveFilter =
    (activeFilter === "top_lead_scorer" && topScorersCount === 0) ||
    (activeFilter === "birthday" && birthdaysCount === 0) ||
    (activeFilter === "anniversary" && anniversariesCount === 0)
      ? "all"
      : activeFilter;

  const filteredItems = rawItems.filter((item) => {
    if (effectiveFilter === "all") return true;
    return item.type === effectiveFilter;
  });

  // Distinct category count
  const distinctCategoryCount =
    (topScorersCount > 0 ? 1 : 0) +
    (birthdaysCount > 0 ? 1 : 0) +
    (anniversariesCount > 0 ? 1 : 0);

  // Pagination for slider mode
  const sliderPageSize = 3;
  const maxSliderPage = Math.max(0, Math.ceil(filteredItems.length / sliderPageSize) - 1);
  const visibleSliderItems = filteredItems.slice(
    sliderIndex * sliderPageSize,
    (sliderIndex + 1) * sliderPageSize
  );

  const speedClass =
    speed === "fast"
      ? "animate-ticker-fast"
      : speed === "slow"
        ? "animate-ticker-slow"
        : "animate-ticker";

  // Hide recognition bar if offline or loading with no data
  if ((error || isLoading) && !data) {
    return null;
  }

  // Until and unless any agent has achieved target (or there are birthdays/anniversaries), show nothing
  if (rawItems.length === 0) {
    return null;
  }

  const loopedItems = filteredItems.length > 0 ? [...filteredItems, ...filteredItems] : [];

  return (
    <div className="w-full mt-1.5 rounded-2xl border border-slate-200/90 dark:border-white/10 border-t-[3px] border-t-cyan-400 bg-white/95 dark:bg-[#000000] shadow-sm overflow-hidden backdrop-blur-md transition-all">
      {/* Top Header Row matching the exact screenshot layout */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 select-none bg-slate-50/70 dark:bg-[#050505]">
        {/* Left: Section Header Title */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Live Recognition & Announcements</span>
        </div>

        {/* Right: Quick Category Filter Pills & Mode Pill Controls */}
        <div className="flex items-center gap-1.5 text-[10.5px]">
          {/* Quick Filter Pill Buttons (rendered only when multiple categories exist) */}
          {distinctCategoryCount > 1 && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveFilter("all");
                  setSliderIndex(0);
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                  effectiveFilter === "all"
                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-400/40"
                    : "bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All ({rawItems.length})
              </button>
              {topScorersCount > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter("top_lead_scorer");
                    setSliderIndex(0);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                    effectiveFilter === "top_lead_scorer"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40"
                      : "bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Trophy className="w-2.5 h-2.5 text-amber-500" />
                  <span>Top ({topScorersCount})</span>
                </button>
              )}
              {birthdaysCount > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter("birthday");
                    setSliderIndex(0);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                    effectiveFilter === "birthday"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40"
                      : "bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Cake className="w-2.5 h-2.5 text-rose-500" />
                  <span>Birthdays ({birthdaysCount})</span>
                </button>
              )}
              {anniversariesCount > 0 && (
                <button
                  onClick={() => {
                    setActiveFilter("anniversary");
                    setSliderIndex(0);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                    effectiveFilter === "anniversary"
                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40"
                      : "bg-white dark:bg-[#0a0a0a] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Award className="w-2.5 h-2.5 text-purple-500" />
                  <span>Anniv ({anniversariesCount})</span>
                </button>
              )}
            </div>
          )}

          {/* Active Cards Pill - matches screenshot */}
          <span className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0a0a0a] text-slate-600 dark:text-slate-300 text-[10.5px] font-medium shadow-2xs">
            {filteredItems.length} active card{filteredItems.length === 1 ? "" : "s"}
          </span>

          {/* Mode Pill - matches screenshot */}
          <button
            onClick={() => setDisplayMode(displayMode === "marquee" ? "slider" : "marquee")}
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0a0a0a] hover:bg-slate-100 dark:hover:bg-[#141414] text-slate-600 dark:text-slate-300 text-[10.5px] font-medium transition-colors cursor-pointer shadow-2xs"
            title="Toggle between Marquee Ticker and Card Slider"
          >
            Mode: {displayMode === "marquee" ? "Marquee" : "Slider"}
          </button>
        </div>
      </div>


      {/* Main Content Area: Single-line Horizontal Flow */}
      {filteredItems.length === 0 ? (
        <div className="py-2.5 px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            {effectiveFilter === "birthday" && <Cake className="w-3.5 h-3.5 text-rose-500" />}
            {effectiveFilter === "anniversary" && <Award className="w-3.5 h-3.5 text-purple-500" />}
            {effectiveFilter === "top_lead_scorer" && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
            <span>
              {effectiveFilter === "top_lead_scorer"
                ? `No agents have achieved their daily incentive target yet (${data?.target_date || "Today"}).`
                : `No ${effectiveFilter === "birthday" ? "birthdays" : "work anniversaries"} celebrating today (${data?.target_date || "Today"}).`}
            </span>
          </div>
          <button
            onClick={() => setActiveFilter("all")}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer text-[10.5px]"
          >
            {topScorersCount > 0 ? `Show Target Achievers Today (${topScorersCount}) →` : "Show All Cards →"}
          </button>
        </div>
      ) : displayMode === "marquee" ? (
        <div
          className="relative w-full overflow-hidden py-2 px-2 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle edge fade overlays for light & dark mode */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-[#000000] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-[#000000] to-transparent z-10 pointer-events-none" />

          <div
            className={speedClass}
            style={{
              animationPlayState: isPaused ? "paused" : "running",
            }}
          >
            {loopedItems.map((item, idx) => (
              <RecognitionCard key={`${item.id}-${idx}`} item={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <AnimatePresence mode="wait">
            {visibleSliderItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <RecognitionCard item={item} isSlider />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Celebratory Card Strip
 * Structured as a single sleek horizontal pill exactly as in the CRM Admin Dashboard screenshot:
 * [Photo] [🏆 Badge] [#Rank] Cyrus Navrathinam • Operations • 112.5% productivity today...
 */
function RecognitionCard({
  item,
  isSlider = false,
}: {
  item: RecognitionTickerItem;
  isSlider?: boolean;
}) {
  const earnedIncentive = Number(item.incentive_amount) || 0;

  return (
    <div
      className={`relative mx-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#070707] hover:border-cyan-400/50 dark:hover:border-cyan-400/50 shadow-2xs flex items-center gap-2.5 whitespace-nowrap shrink-0 transition-all ${
        isSlider ? "w-full justify-between" : "max-w-none"
      }`}
    >
      {/* 1. Name */}
      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13.5px] tracking-tight shrink-0">
        {item.title}
      </span>

      {/* 2. Amount Only (or celebratory badge if birthday/anniversary without amount) */}
      {earnedIncentive > 0 ? (
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/90 dark:border-emerald-500/30 px-2 py-0.5 rounded-md text-xs sm:text-[13px] shrink-0 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>₹{earnedIncentive.toLocaleString("en-IN")}</span>
        </span>
      ) : item.type === "birthday" || item.type === "anniversary" ? (
        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border border-rose-200/90 dark:border-rose-500/30 px-2 py-0.5 rounded-md shrink-0">
          {item.badge || item.eyebrow}
        </span>
      ) : null}
    </div>
  );
}
