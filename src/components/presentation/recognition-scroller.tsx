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
  Play,
  Pause,
  Flame,
  Star,
  Users,
  RefreshCw,
  Sliders,
  CheckCircle2,
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

  // Speed class for marquee
  const speedClass =
    speed === "fast"
      ? "animate-ticker-fast"
      : speed === "slow"
      ? "animate-ticker-slow"
      : "animate-ticker";

  if (error && !data) {
    return (
      <div className="w-full glass-panel px-4 py-2.5 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>Recognition & Announcements: Offline ({error.message})</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-white font-medium text-[11px]"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="w-full glass-panel px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-3 text-xs text-slate-400">
        <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
        <span>Loading live celebrations, top scorers, birthdays & anniversaries from CRM...</span>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return null;
  }

  // Duplicate items for continuous seamless loop in marquee
  const loopedItems = [...filteredItems, ...filteredItems];

  return (
    <div className="w-full glass-panel rounded-2xl border border-white/10 shadow-xl overflow-hidden backdrop-blur-xl relative">
      {/* Top micro-bar controls */}
      <div className="px-4 py-2 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Left: Section Header with Live Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-cyan-500/20 border border-amber-400/30 text-amber-300 font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[10px] uppercase">Live Floor Recognition</span>
          </div>

          {/* Quick counts pill */}
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[10px]">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <Trophy className="w-3 h-3 text-amber-400" /> {topScorersCount} Top Scorers
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-rose-300 font-medium">
              <Cake className="w-3 h-3 text-rose-400" /> {birthdaysCount} Birthdays
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-cyan-300 font-medium">
              <Award className="w-3 h-3 text-cyan-400" /> {anniversariesCount} Anniversaries
            </span>
          </div>
        </div>

        {/* Right: Category Filter Pills & Mode Toggles */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => {
                setActiveFilter("all");
                setSliderIndex(0);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
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
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "top_lead_scorer"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="w-2.5 h-2.5 text-amber-400" />
              <span>Top Scorers</span>
            </button>
            <button
              onClick={() => {
                setActiveFilter("birthday");
                setSliderIndex(0);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "birthday"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Cake className="w-2.5 h-2.5 text-rose-400" />
              <span>Birthdays</span>
            </button>
            <button
              onClick={() => {
                setActiveFilter("anniversary");
                setSliderIndex(0);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 ${
                activeFilter === "anniversary"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Award className="w-2.5 h-2.5 text-cyan-400" />
              <span>Anniversaries</span>
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDisplayMode(displayMode === "marquee" ? "slider" : "marquee")}
              className="p-1 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 px-2"
              title="Toggle between Marquee Ticker and Card Slider"
            >
              <span>{displayMode === "marquee" ? "Ticker" : "Slider"}</span>
            </button>

            {displayMode === "marquee" ? (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                title={isPaused ? "Resume Ticker" : "Pause Ticker"}
              >
                {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevSlider}
                  className="p-1 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  onClick={handleNextSlider}
                  className="p-1 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area: Marquee Ticker OR Slider */}
      {displayMode === "marquee" ? (
        <div
          className="relative w-full overflow-hidden py-2.5 select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Subtle gradient fades on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#070b14] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#070b14] to-transparent z-10 pointer-events-none" />

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
        /* Slider Mode: 3 Spotlight Cards */
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <AnimatePresence mode="wait">
            {visibleSliderItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
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
 * Individual Celebratory Card
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

  // Card theme colors & accents
  const borderClass = isTopScorer
    ? "border-amber-500/40 hover:border-amber-400 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/20 shadow-amber-500/10"
    : isBirthday
    ? "border-rose-500/40 hover:border-rose-400 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-pink-950/20 shadow-rose-500/10"
    : "border-cyan-500/40 hover:border-cyan-400 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-blue-950/20 shadow-cyan-500/10";

  const badgeBg = isTopScorer
    ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
    : isBirthday
    ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
    : "bg-cyan-500/20 text-cyan-300 border-cyan-400/40";

  const iconBg = isTopScorer
    ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/50"
    : isBirthday
    ? "bg-rose-500/20 text-rose-400 ring-1 ring-rose-400/50"
    : "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/50";

  const initials = item.title
    .replace(/^Happy (Birthday|Work Anniversary),?\s*/i, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`relative mx-2 px-3.5 py-2 rounded-xl border ${borderClass} transition-all duration-300 shadow-lg flex items-center gap-3 shrink-0 ${
        isSlider ? "w-full" : "min-w-[320px] max-w-[380px]"
      }`}
    >
      {/* Avatar / Icon Bubble */}
      <div className="relative shrink-0">
        {item.profile_pic ? (
          <img
            src={item.profile_pic}
            alt={item.title}
            className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/20 shadow-md bg-slate-800"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
              const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{ display: item.profile_pic ? "none" : "flex" }}
          className={`w-10 h-10 rounded-xl ${iconBg} items-center justify-center font-bold text-xs`}
        >
          {isTopScorer && <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />}
          {isBirthday && <Cake className="w-5 h-5 text-rose-400 animate-bounce" />}
          {isAnniversary && <Award className="w-5 h-5 text-cyan-400 animate-pulse" />}
        </div>

        {/* Small floating rank or initial medal */}
        {isTopScorer && item.rank && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow">
            {item.rank}
          </span>
        )}
      </div>

      {/* Card Content Text */}
      <div className="flex-1 min-w-0">
        {/* Top Eyebrow & Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeBg}`}>
            {item.badge}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            {item.eyebrow}
          </span>
        </div>

        {/* Title */}
        <div className="font-bold text-xs text-white truncate mt-0.5 tracking-tight">
          {item.title}
        </div>

        {/* Subtitle with Stats */}
        <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
          {item.subtitle}
        </div>
      </div>
    </div>
  );
}
