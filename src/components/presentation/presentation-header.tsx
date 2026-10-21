"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RefreshCw,
  Server,
  SlidersHorizontal,
  Activity,
  Layers,
  ChevronRight,
  Tv,
} from "lucide-react";

import ThemeToggle from "@/components/theme/theme-toggle";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";

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
}: PresentationHeaderProps) {
  const [clock, setClock] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
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
    <header className="w-full glass-panel border-b border-slate-200/80 dark:border-white/10 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-40 transition-all">
      {/* Brand & Live Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">DemandFlow</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 rounded">
                LIVE ANALYTICS
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>Bridge CRM</span>
              <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">Operations Center</span>
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300/70 dark:border-slate-700 text-xs">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLiveConnection ? "bg-emerald-400" : "bg-rose-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLiveConnection ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className={isLiveConnection ? "text-emerald-700 dark:text-emerald-300 font-medium" : "text-rose-700 dark:text-rose-300 font-medium"}>
            {isLiveConnection ? "CRM Connected" : "Connecting to CRM API..."}
          </span>
          {lastRefreshed && (
            <span className="text-slate-500 dark:text-slate-500 text-[10px] ml-1">
              (Synced {new Date(lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </div>
      </div>

      {/* Slide Navigation Buttons */}
      <div className="flex items-center bg-slate-200/70 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-300/70 dark:border-white/10 gap-1 shadow-inner">
        {SLIDE_TITLES.map((slide) => {
          const isActive = currentSlide === slide.id;
          return (
            <button
              key={slide.id}
              onClick={() => onSelectSlide(slide.id)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 dark:border-cyan-400/40 shadow-sm font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-white/5"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  isActive ? "bg-cyan-500 text-black" : "bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                }`}
              >
                {slide.id}
              </span>
              <span className="hidden md:inline">{slide.label}</span>
              <span className="md:hidden">{slide.short}</span>
              {isActive && autoRotate && (
                <span className="ml-1 px-1 py-0.2 text-[9px] bg-cyan-400/25 text-cyan-700 dark:text-cyan-300 rounded font-bold animate-pulse">
                  {countdownSeconds}s
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls & Clock */}
      <div className="flex items-center gap-2">
        {/* Heatmap Granularity Selector (visible on Slide 3 and Slide 4) */}
        {(currentSlide === 3 || currentSlide === 4) && onHeatmapIntervalChange && (
          <div className="hidden lg:flex items-center">
            <HeatmapIntervalSelector
              value={heatmapInterval || 10}
              onChange={onHeatmapIntervalChange}
              compact
            />
          </div>
        )}
        {/* Auto Rotate Toggle */}
        <button
          onClick={onToggleAutoRotate}
          title={autoRotate ? "Pause auto-slide rotation" : "Enable auto-slide rotation"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            autoRotate
              ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{autoRotate ? "Auto" : "Paused"}</span>
        </button>

        {/* Manual Refresh */}
        {onManualRefresh && (
          <button
            onClick={onManualRefresh}
            title="Refresh analytics data"
            className={`p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
              isFetching ? "animate-spin text-cyan-500" : ""
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 65" Floor TV Display Mode Toggle */}
        {onToggleTvMode && (
          <button
            onClick={onToggleTvMode}
            title={isTvMode ? "65″ Floor TV Mode: Active (Optimized for wall monitors)" : "Enable 65″ Floor TV Mode"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              isTvMode
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 shadow-sm shadow-cyan-500/20"
                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden xl:inline">65″ TV</span>
            <span className={`w-2 h-2 rounded-full ${isTvMode ? "bg-cyan-400 animate-pulse" : "bg-slate-400"}`} />
          </button>
        )}

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title="Toggle 1920x1080 Fullscreen Presentation"
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Admin Link */}
        <Link
          href="/admin/campaign-targets"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden sm:inline font-medium">Admin</span>
        </Link>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center pl-2 border-l border-slate-300 dark:border-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
          {clock || "--:--:--"}
        </div>
      </div>
    </header>
  );
}
