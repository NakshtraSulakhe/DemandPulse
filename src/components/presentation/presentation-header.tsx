"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Tv,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ThemeToggle from "@/components/theme/theme-toggle";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";
import SlideDateFilter from "@/components/presentation/slide-date-filter";
import { useShiftEngine } from "@/hooks/useShiftEngine";

interface PresentationHeaderProps {
  currentSlide: number;
  totalSlides: number;
  onSelectSlide: (slide: number) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  countdownSeconds: number;
  isLiveConnection?: boolean;
  lastRefreshed?: string;
  isFetching?: boolean;
  onManualRefresh?: () => void;
  heatmapInterval?: number;
  onHeatmapIntervalChange?: (interval: number) => void;
  isTvMode?: boolean;
  onToggleTvMode?: () => void;
  selectedDate?: string;
  onDateChange?: (date: string | undefined) => void;
  onApplyDateToAll?: (date: string) => void;
}

const SLIDE_TITLES = [
  { id: 1, label: "Operations Overview", short: "Ops" },
  { id: 2, label: "Agent Productivity", short: "Agents" },
  { id: 3, label: "QA Timewise Heatmap", short: "QA Map" },
  { id: 4, label: "Agent Lead Heatmap", short: "Agent Map" },
  { id: 5, label: "Comparative Analytics", short: "Comparison" },
];

export default function PresentationHeader({
  currentSlide,
  totalSlides,
  onSelectSlide,
  autoRotate,
  onToggleAutoRotate,
  countdownSeconds,
  isLiveConnection = true,
  lastRefreshed,
  isFetching = false,
  onManualRefresh,
  heatmapInterval,
  onHeatmapIntervalChange,
  isTvMode = true,
  onToggleTvMode,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: PresentationHeaderProps) {
  // Drawer open/closed state backed by MySQL database (zero localStorage)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [clock, setClock] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const shift = useShiftEngine(5000);

  useEffect(() => {
    // 1. One-time cleanup of legacy localStorage key
    try {
      const saved = localStorage.getItem("demandflow-header-drawer-open");
      if (saved !== null) {
        setIsDrawerOpen(saved === "true");
        localStorage.removeItem("demandflow-header-drawer-open");
      }
    } catch {}

    // 2. Fetch authoritative setting from MySQL database
    fetch("/api/slides/preferences")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && typeof res.data?.headerDrawerOpen === "boolean") {
          setIsDrawerOpen(res.data.headerDrawerOpen);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleDrawer = (open: boolean) => {
    setIsDrawerOpen(open);
    // Persist to MySQL database (zero localStorage)
    fetch("/api/slides/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headerDrawerOpen: open }),
    }).catch(() => {});
  };

  const activeSlideInfo = SLIDE_TITLES.find((s) => s.id === currentSlide) || SLIDE_TITLES[0];

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div className="w-full relative z-40 select-none">
      {/* Collapsed Drawer Minimal Strip (Visible when drawer is tucked away) */}
      {!isDrawerOpen && (
        <div className="w-full bg-slate-900/95 dark:bg-slate-950/98 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between shadow-xl backdrop-blur-2xl text-xs animate-fadeIn">
          {/* Left: Active Slide Info & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-sm">
              <Activity className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">
                Slide {currentSlide}: {activeSlideInfo.label}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${autoRotate
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-400/30"
                  }`}
              >
                {autoRotate ? `${countdownSeconds}s remaining` : "Rotation Paused"}
              </span>
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Shift: {shift.businessDate}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300">US: {shift.currentUsFormatted || "—"}</span>
              </div>
            </div>
          </div>

          {/* Center: Interactive Pull-Down Tab */}
          <button
            onClick={() => handleToggleDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-400/40 text-cyan-300 hover:text-white transition-all shadow-sm cursor-pointer group hover:scale-[1.02]"
            title="Click to pull down the slide navigation and controls drawer"
          >
            <span className="text-[11px] font-bold">Slide Navigation & Controls Drawer</span>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
          </button>

          {/* Right: Quick Play/Pause & Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleAutoRotate}
              title={autoRotate ? "Pause slide rotation" : "Resume slide rotation"}
              className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${autoRotate
                  ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30"
                  : "bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30"
                }`}
            >
              {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="text-[10px]">{autoRotate ? "Pause" : "Play"}</span>
            </button>

            {onToggleTvMode && (
              <button
                onClick={onToggleTvMode}
                title={isTvMode ? "TV Mode: Active" : "Enable TV Mode"}
                className={`p-1 rounded-lg border text-[10px] flex items-center gap-1 ${isTvMode
                    ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-300"
                    : "bg-slate-800 border-white/10 text-slate-400"
                  }`}
              >
                <Tv className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              title="Fullscreen"
              className="p-1 rounded-lg bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>

            <span className="text-[11px] font-mono text-slate-400 pl-2 border-l border-white/10 hidden sm:inline">
              {clock || "--:--:--"}
            </span>
          </div>
        </div>
      )}

      {/* Expanded Drawer (Slide Navigation & Pause Controls Strip) */}
      <AnimatePresence initial={false}>
        {isDrawerOpen && (
          <motion.div
            key="header-drawer-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <header className="w-full glass-panel border-b border-cyan-500/30 px-4 sm:px-6 py-2 shadow-2xl backdrop-blur-2xl relative flex flex-col gap-2">
              {/* Row 1: Brand + Slides Name Strip + Pause Button */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                {/* Left: Brand & Live Status */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30 shrink-0">
                    <Activity className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tracking-tight text-slate-900 dark:text-white text-xs sm:text-sm">
                        DemandPulse
                      </span>
                      <span className="px-1 py-0.2 text-[8.5px] font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded">
                        LIVE
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>Bridge CRM</span>
                      <ChevronRight className="w-2.5 h-2.5 text-slate-400 dark:text-slate-600" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">Ops Center</span>
                    </p>
                  </div>

                  {/* Connected Status Pill */}
                  <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700 text-[10.5px]">
                    <span className="relative flex h-2 w-2">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnection ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnection ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                      />
                    </span>
                    <span
                      className={
                        isLiveConnection
                          ? "text-emerald-700 dark:text-emerald-300 font-medium text-[10px]"
                          : "text-rose-700 dark:text-rose-300 font-medium text-[10px]"
                      }
                    >
                      {isLiveConnection ? "Connected" : "Connecting..."}
                    </span>
                  </div>
                </div>

                {/* Center: The Slides Name Strip */}
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-950/90 p-0.5 rounded-xl border border-slate-300/70 dark:border-white/10 gap-0.5 shadow-inner">
                  {SLIDE_TITLES.map((slide) => {
                    const isActive = currentSlide === slide.id;
                    return (
                      <button
                        key={slide.id}
                        onClick={() => onSelectSlide(slide.id)}
                        className={`relative px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${isActive
                            ? "bg-gradient-to-r from-cyan-500/25 to-blue-600/35 text-cyan-900 dark:text-cyan-200 border border-cyan-500/50 dark:border-cyan-400/50 shadow font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-white/5"
                          }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold ${isActive
                              ? "bg-cyan-500 text-black shadow-sm"
                              : "bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                            }`}
                        >
                          {slide.id}
                        </span>
                        <span className="hidden md:inline text-[11px]">{slide.label}</span>
                        <span className="md:hidden text-[11px]">{slide.short}</span>
                        {isActive && autoRotate && (
                          <span className="ml-0.5 px-1 py-0.2 text-[8.5px] bg-cyan-400/25 text-cyan-800 dark:text-cyan-200 rounded font-black animate-pulse">
                            {countdownSeconds}s
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right: The Pause Button & Hide Drawer */}
                <div className="flex items-center gap-1.5">
                  {/* Primary Pause / Play Button */}
                  <button
                    onClick={onToggleAutoRotate}
                    title={autoRotate ? "Pause auto-slide rotation" : "Resume auto-slide rotation"}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm ${autoRotate
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-500/30"
                        : "bg-emerald-500/20 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/30"
                      }`}
                  >
                    {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{autoRotate ? `Pause (${countdownSeconds}s)` : "Play Rotation"}</span>
                  </button>

                  {/* Hide Drawer Button */}
                  <button
                    onClick={() => handleToggleDrawer(false)}
                    title="Tuck away the navigation and controls drawer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-400/40 text-cyan-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline font-bold">Hide Drawer</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Secondary Controls Strip (Heatmap Granularity, Refresh, TV Mode, Theme, Fullscreen, Admin, Clock) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-white/5 text-xs">
                {/* Left: Active Slide Date Filter & Granularity Selector */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {onDateChange && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Shift Date:</span>
                      <SlideDateFilter
                        selectedDate={selectedDate}
                        onDateChange={onDateChange}
                        onApplyToAll={onApplyDateToAll}
                        showApplyToAll={!!onApplyDateToAll}
                        compact
                      />
                    </div>
                  )}

                  {(currentSlide === 3 || currentSlide === 4) && onHeatmapIntervalChange && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10">
                      <span className="text-[10px] text-slate-400 font-medium">Interval:</span>
                      <HeatmapIntervalSelector
                        value={heatmapInterval || 30}
                        onChange={onHeatmapIntervalChange}
                        compact
                      />
                    </div>
                  )}
                </div>

                {/* Right: Utility Tools Strip */}
                <div className="flex items-center gap-1.5">
                  {/* Manual Refresh */}
                  {onManualRefresh && (
                    <button
                      onClick={onManualRefresh}
                      title="Refresh CRM analytics data"
                      className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ${isFetching ? "animate-spin text-cyan-500" : ""
                        }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}

                  {/* 65" Floor TV Display Mode Toggle */}
                  {onToggleTvMode && (
                    <button
                      onClick={onToggleTvMode}
                      title={isTvMode ? "65″ Floor TV Mode: Active" : "Enable 65″ Floor TV Mode"}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${isTvMode
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                      <Tv className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      <span className="hidden xl:inline">TV</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isTvMode ? "bg-cyan-400 animate-pulse" : "bg-slate-400"}`} />
                    </button>
                  )}

                  {/* Theme Toggle Button */}
                  <ThemeToggle />

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={toggleFullscreen}
                    title="Toggle Fullscreen"
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>

                  {/* Admin Link */}
                  <Link
                    href="/admin/campaign-targets"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-[10.5px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-cyan-500" />
                    <span className="hidden sm:inline font-medium">Admin</span>
                  </Link>

                  {/* Live Dual Clock & Shift Business Date */}
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-800 text-[11px] font-mono">
                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <span className="text-[9.5px] font-bold text-slate-400">IST:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{shift.currentIstFormatted || clock}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <span className="text-[9.5px] font-bold text-slate-400">US ({shift.usTimezoneAbbr}):</span>
                      <span className="font-bold">{shift.currentUsFormatted || "—"}</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700 hidden xl:inline">•</span>
                    <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/20 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Shift: {shift.businessDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
