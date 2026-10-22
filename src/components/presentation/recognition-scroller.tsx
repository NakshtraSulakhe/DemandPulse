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

  const rawItems = data?.ticker_items || [];

  const filteredItems = rawItems.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  const topScorersCount = data?.top_scorers_count || 0;
  const birthdaysCount = data?.birthdays_count || 0;
  const anniversariesCount = data?.anniversaries_count || 0;

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

  if (error && !data) {
    return (
      <div className="w-full px-3.5 py-2 rounded-2xl border border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[11px] font-medium">Daily Recognition: Offline ({error.message})</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 shadow-xs">
        <div className="w-3.5 h-3.5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-[11px] font-medium">Syncing live celebrations & top scorers...</span>
      </div>
    );
  }

  if (rawItems.length === 0) {
    return null;
  }

  const loopedItems = filteredItems.length > 0 ? [...filteredItems, ...filteredItems] : [];

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 border-t-[3px] border-t-cyan-400 bg-white/95 dark:bg-slate-900/90 shadow-sm overflow-hidden backdrop-blur-md transition-all">
      {/* Top Header Row matching the exact screenshot layout */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 select-none bg-slate-50/70 dark:bg-slate-950/40">
        {/* Left: Section Header Title */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Live Recognition & Announcements</span>
        </div>

        {/* Right: Quick Category Filter Pills & Mode Pill Controls */}
        <div className="flex items-center gap-1.5 text-[10.5px]">
          {/* Quick Filter Pill Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => {
                setActiveFilter("all");
                setSliderIndex(0);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-400/40"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All ({rawItems.length})
            </button>
            <button
              onClick={() => {
                setActiveFilter("top_lead_scorer");
                setSliderIndex(0);
              }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                activeFilter === "top_lead_scorer"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40"
                  : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Trophy className="w-2.5 h-2.5 text-amber-500" />
              <span>Top ({topScorersCount})</span>
            </button>
            {birthdaysCount > 0 && (
              <button
                onClick={() => {
                  setActiveFilter("birthday");
                  setSliderIndex(0);
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                  activeFilter === "birthday"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
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
                  activeFilter === "anniversary"
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Award className="w-2.5 h-2.5 text-purple-500" />
                <span>Anniv ({anniversariesCount})</span>
              </button>
            )}
          </div>

          {/* Active Cards Pill - matches screenshot */}
          <span className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px] font-medium shadow-2xs">
            {filteredItems.length} active card{filteredItems.length === 1 ? "" : "s"}
          </span>

          {/* Mode Pill - matches screenshot */}
          <button
            onClick={() => setDisplayMode(displayMode === "marquee" ? "slider" : "marquee")}
            className="px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10.5px] font-medium transition-colors cursor-pointer shadow-2xs"
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
            {activeFilter === "birthday" && <Cake className="w-3.5 h-3.5 text-rose-500" />}
            {activeFilter === "anniversary" && <Award className="w-3.5 h-3.5 text-purple-500" />}
            {activeFilter === "top_lead_scorer" && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
            <span>
              No {activeFilter === "birthday" ? "birthdays" : activeFilter === "anniversary" ? "work anniversaries" : "records"} celebrating today ({data?.target_date || "Today"}).
            </span>
          </div>
          <button
            onClick={() => setActiveFilter("all")}
            className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer text-[10.5px]"
          >
            Show Top Scorers Today ({topScorersCount}) →
          </button>
        </div>
      ) : displayMode === "marquee" ? (
        <div
          className="relative w-full overflow-hidden py-2 px-2 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle edge fade overlays for light & dark mode */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-[#070b14] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-[#070b14] to-transparent z-10 pointer-events-none" />

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
  const isTopScorer = item.type === "top_lead_scorer";
  const isBirthday = item.type === "birthday";
  const isAnniversary = item.type === "anniversary";

  // Check if item is a target achiever (top lead scorer or explicitly labelled target achiever)
  const isTargetAchiever =
    isTopScorer ||
    item.eyebrow?.toLowerCase().includes("target achiever") ||
    item.badge?.toLowerCase().includes("target achiever");

  // Category Badge Pill Styling with high contrast in both Light & Dark modes
  const badgeClasses = isTopScorer
    ? "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200/90 dark:border-sky-500/30"
    : isBirthday
    ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200/90 dark:border-rose-500/30"
    : "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200/90 dark:border-purple-500/30";

  // Avatar Icon fallback background
  const iconBg = isTopScorer
    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
    : isBirthday
    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
    : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300";

  // Resolve earned daily incentive amount
  let earnedIncentive = item.incentive_amount;
  if (!earnedIncentive && isTargetAchiever) {
    const textPool = `${item.eyebrow || ""} ${item.message || ""} ${item.subtitle || ""}`;
    const match = textPool.match(/(?:₹|INR\s*|Rs\.?\s*)(\d+[\d,]*)/i);
    if (match) {
      earnedIncentive = parseInt(match[1].replace(/,/g, ""), 10);
    } else if (item.completion_percentage && item.completion_percentage >= 150) {
      earnedIncentive = 1100;
    } else if (item.completion_percentage && item.completion_percentage >= 125) {
      earnedIncentive = 850;
    } else if (item.score && item.score >= 8) {
      earnedIncentive = 600;
    } else {
      earnedIncentive = 500;
    }
  }

  // Format the earned daily incentive text
  const formattedIncentiveText = earnedIncentive != null
    ? `₹${earnedIncentive.toLocaleString("en-IN")} Daily Incentive Earned`
    : `₹500 Daily Incentive Earned`;

  // Display text: For target achievers, ALWAYS show the earned daily incentive amount instead of "Today's Target Achiever"
  const hasIncentiveInEyebrow = item.eyebrow && (item.eyebrow.includes("₹") || item.eyebrow.toLowerCase().includes("incentive"));
  const departmentOrIncentive = isTargetAchiever
    ? (hasIncentiveInEyebrow ? item.eyebrow : formattedIncentiveText)
    : (item.eyebrow || (isTopScorer ? "Operations" : "Team Member"));

  // Achievement text / Subtitle
  const detailsText = item.subtitle || item.message || "";

  return (
    <div
      className={`relative mx-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/80 hover:border-cyan-400/50 shadow-2xs flex items-center gap-2.5 whitespace-nowrap shrink-0 transition-all ${
        isSlider ? "w-full" : "max-w-none"
      }`}
    >
      {/* 1. Circular Avatar Photo / Icon Bubble */}
      <div className="relative shrink-0">
        {item.profile_pic ? (
          <img
            src={item.profile_pic}
            alt={item.title}
            className="w-7 h-7 sm:w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20 shadow-xs bg-slate-100 dark:bg-slate-800"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{ display: item.profile_pic ? "none" : "flex" }}
          className={`w-7 h-7 sm:w-8 h-8 rounded-full ${iconBg} items-center justify-center font-bold shadow-xs`}
        >
          {isTopScorer && <Trophy className="w-3.5 h-3.5" />}
          {isBirthday && <Cake className="w-3.5 h-3.5" />}
          {isAnniversary && <Award className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* 2. Category Badge Pill (e.g. 🏆 Daily Incentive Winner) */}
      <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${badgeClasses}`}>
        {isTopScorer && <Trophy className="w-3 h-3 text-sky-600 dark:text-sky-400" />}
        {isBirthday && <Cake className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
        {isAnniversary && <Award className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
        <span>{item.badge}</span>
      </div>

      {/* 3. Rank Badge (#5) if available */}
      {item.rank && (
        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 text-[10.5px] font-mono font-bold shrink-0">
          #{item.rank}
        </span>
      )}

      {/* 4. Agent Name: Bold, high contrast in both light & dark mode */}
      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-[13.5px] tracking-tight shrink-0">
        {item.title}
      </span>

      {/* 5. Separator Bullet */}
      <span className="text-slate-300 dark:text-slate-600 font-bold mx-0.5 select-none shrink-0">•</span>

      {/* 6. Earned Daily Incentive Amount (for Target Achievers) or Department / Role */}
      {isTargetAchiever ? (
        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200/90 dark:border-emerald-500/30 px-2 py-0.5 rounded-md text-xs shrink-0 shadow-2xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>{departmentOrIncentive}</span>
        </span>
      ) : (
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium shrink-0">
          {departmentOrIncentive}
        </span>
      )}

      {/* 7. Separator Bullet */}
      {detailsText && (
        <span className="text-slate-300 dark:text-slate-600 font-bold mx-0.5 select-none shrink-0">•</span>
      )}

      {/* 8. Achievement message / Productivity */}
      {detailsText && (
        <span className="text-slate-600 dark:text-slate-300 text-xs font-normal truncate">
          {detailsText}
        </span>
      )}
    </div>
  );
}
