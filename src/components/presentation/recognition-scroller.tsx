"use client";

import React, { useState } from "react";
import { RecognitionData, RecognitionTickerItem } from "@/types";
import {
  Trophy,
  Cake,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Sliders,
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

  const handleNextSlider = () => {
    setSliderIndex((prev) => (prev >= maxSliderPage ? 0 : prev + 1));
  };

  const handlePrevSlider = () => {
    setSliderIndex((prev) => (prev <= 0 ? maxSliderPage : prev - 1));
  };

  const speedClass =
    speed === "fast"
      ? "animate-ticker-fast"
      : speed === "slow"
      ? "animate-ticker-slow"
      : "animate-ticker";

  if (error && !data) {
    return (
      <div className="w-full glass-panel px-3 py-1.5 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px]">Daily Recognition: Offline ({error.message})</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-white font-medium text-[10px]"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="w-full glass-panel px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2.5 text-xs text-slate-400">
        <div className="w-3 h-3 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-[11px]">Syncing live celebrations & top scorers...</span>
      </div>
    );
  }

  if (rawItems.length === 0) {
    return null;
  }

  const loopedItems = filteredItems.length > 0 ? [...filteredItems, ...filteredItems] : [];

  return (
    <div className="w-full glass-panel rounded-xl border border-white/10 shadow-lg overflow-hidden backdrop-blur-xl relative transition-all">
      {/* Top Status & Controls Bar */}
      <div className="px-3 py-1.5 bg-slate-900/70 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] select-none">
        {/* Left: Section Header with Live Indicator & Quick Counts */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-cyan-500/15 border border-amber-400/25 text-amber-300 font-bold tracking-wide">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-[9.5px] uppercase font-black tracking-wider">
              Daily Recognition
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[10px]">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <Trophy className="w-2.5 h-2.5 text-amber-400" /> {topScorersCount} Top Scorers Today
            </span>
            <span>•</span>
            <span
              className={`flex items-center gap-1 font-medium ${
                birthdaysCount > 0 ? "text-rose-300 font-bold animate-pulse" : "text-slate-400"
              }`}
            >
              <Cake className="w-2.5 h-2.5 text-rose-400" /> {birthdaysCount} Birthdays
            </span>
            <span>•</span>
            <span
              className={`flex items-center gap-1 font-medium ${
                anniversariesCount > 0 ? "text-cyan-300 font-bold animate-pulse" : "text-slate-400"
              }`}
            >
              <Award className="w-2.5 h-2.5 text-cyan-400" /> {anniversariesCount} Anniversaries
            </span>
          </div>
        </div>

        {/* Right: Category Filter Pills & Mode Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-md border border-white/10">
            <button
              onClick={() => {
                setActiveFilter("all");
                setSliderIndex(0);
              }}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all ${
                activeFilter === "all"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({rawItems.length})
            </button>
            <button
              onClick={() => {
                setActiveFilter("top_lead_scorer");
                setSliderIndex(0);
              }}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "top_lead_scorer"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="w-2.5 h-2.5 text-amber-400" />
              <span>Top ({topScorersCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveFilter("birthday");
                setSliderIndex(0);
              }}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "birthday"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cake className="w-2.5 h-2.5 text-rose-400" />
              <span>Birthdays ({birthdaysCount})</span>
            </button>
            <button
              onClick={() => {
                setActiveFilter("anniversary");
                setSliderIndex(0);
              }}
              className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "anniversary"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Award className="w-2.5 h-2.5 text-cyan-400" />
              <span>Anniv ({anniversariesCount})</span>
            </button>
          </div>

          <button
            onClick={() => setDisplayMode(displayMode === "marquee" ? "slider" : "marquee")}
            className="p-0.5 rounded bg-slate-900 border border-white/10 text-slate-300 hover:text-white text-[9.5px] flex items-center gap-1 px-1.5 cursor-pointer"
            title="Toggle between Marquee Ticker and Card Slider"
          >
            <span>{displayMode === "marquee" ? "Ticker" : "Cards"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Marquee Ticker OR Slider */}
      {filteredItems.length === 0 ? (
        <div className="py-2 px-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            {activeFilter === "birthday" && <Cake className="w-3.5 h-3.5 text-rose-400" />}
            {activeFilter === "anniversary" && <Award className="w-3.5 h-3.5 text-cyan-400" />}
            {activeFilter === "top_lead_scorer" && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
            <span>
              No {activeFilter === "birthday" ? "birthdays" : activeFilter === "anniversary" ? "work anniversaries" : "records"} celebrating today ({data?.target_date || "Today"}).
            </span>
          </div>
          <button
            onClick={() => setActiveFilter("all")}
            className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline text-[10px]"
          >
            Show Top Scorers Today ({topScorersCount}) →
          </button>
        </div>
      ) : displayMode === "marquee" ? (
        <div
          className="relative w-full overflow-hidden py-1.5 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#070b14] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#070b14] to-transparent z-10 pointer-events-none" />

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
        <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <AnimatePresence mode="wait">
            {visibleSliderItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
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
 * Individual Celebratory Card - Reduced compact dimensions
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

  const borderClass = isTopScorer
    ? "border-amber-500/35 hover:border-amber-400 bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-amber-950/20 shadow-amber-500/5"
    : isBirthday
    ? "border-rose-500/35 hover:border-rose-400 bg-gradient-to-r from-rose-950/30 via-slate-900/90 to-pink-950/20 shadow-rose-500/5"
    : "border-cyan-500/35 hover:border-cyan-400 bg-gradient-to-r from-cyan-950/30 via-slate-900/90 to-blue-950/20 shadow-cyan-500/5";

  const badgeBg = isTopScorer
    ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
    : isBirthday
    ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
    : "bg-cyan-500/15 text-cyan-300 border-cyan-400/30";

  const iconBg = isTopScorer
    ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/40"
    : isBirthday
    ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/40"
    : "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/40";

  return (
    <div
      className={`relative mx-1 px-2.5 py-1.5 rounded-lg border ${borderClass} transition-all duration-200 shadow flex items-center gap-2.5 shrink-0 ${
        isSlider ? "w-full" : "min-w-[190px] max-w-[225px]"
      }`}
    >
      {/* Avatar / Icon Bubble */}
      <div className="relative shrink-0">
        {item.profile_pic ? (
          <img
            src={item.profile_pic}
            alt={item.title}
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/15 shadow bg-slate-800"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{ display: item.profile_pic ? "none" : "flex" }}
          className={`w-8 h-8 rounded-lg ${iconBg} items-center justify-center font-bold text-[10px]`}
        >
          {isTopScorer && <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />}
          {isBirthday && <Cake className="w-4 h-4 text-rose-400 animate-bounce" />}
          {isAnniversary && <Award className="w-4 h-4 text-cyan-400 animate-pulse" />}
        </div>

        {isTopScorer && item.rank && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-[8.5px] flex items-center justify-center shadow">
            {item.rank}
          </span>
        )}
      </div>

      {/* Card Content Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${badgeBg} truncate`}>
            {item.badge}
          </span>
        </div>

        {/* Agent Name: Increased font size and font weight for high visibility on TV displays */}
        <div className="font-extrabold text-[13.5px] sm:text-[14.5px] text-white truncate tracking-tight leading-tight">
          {item.title}
        </div>

        <div className="text-[9.5px] sm:text-[10px] text-slate-300 font-semibold truncate mt-0.5">
          {item.subtitle}
        </div>
      </div>
    </div>
  );
}
