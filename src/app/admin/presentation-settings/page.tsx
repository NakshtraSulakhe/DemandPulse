"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  Tv,
  Clock,
  CheckCircle2,
  Sliders,
  Shield,
  Layers,
  Sun,
  Moon,
  Flame,
  Sparkles,
  Trophy,
  Cake,
  Award,
  Play,
  Monitor,
  RefreshCw,
  ExternalLink,
  Keyboard,
  Info,
  Check,
  RotateCcw,
  Activity,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useCrmConfig } from "@/hooks/use-crm-config";
import { formatIntervalDisplay } from "@/lib/utils";

export default function PresentationSettingsPage() {
  const { theme, setTheme, isDark } = useTheme();
  const { config, updateConfig } = useCrmConfig();

  // Local state backed by MySQL database (zero localStorage)
  const [presentationId, setPresentationId] = useState<string>("1");
  const [playlistItems, setPlaylistItems] = useState<any[]>([]);
  const [slideInterval, setSlideInterval] = useState<number>(25);
  const [heatmapInterval, setHeatmapInterval] = useState<number>(10);
  const [enabledSlides, setEnabledSlides] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });
  const [displayScaling, setDisplayScaling] = useState<string>("tv-1080p");
  const [scrollerEnabled, setScrollerEnabled] = useState(true);
  const [scrollerMode, setScrollerMode] = useState<"marquee" | "slider">("marquee");
  const [scrollerSpeed, setScrollerSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [showTopScorers, setShowTopScorers] = useState(true);
  const [showBirthdays, setShowBirthdays] = useState(true);
  const [showAnniversaries, setShowAnniversaries] = useState(true);
  const [saved, setSaved] = useState(false);
  const [unit, setUnit] = useState<"sec" | "min">("sec");
  const [customInputValue, setCustomInputValue] = useState<string>("25");

  // Load authoritative settings from MySQL database on mount
  useEffect(() => {
    // 1. One-time cleanup of any legacy localStorage keys in admin browser
    try {
      localStorage.removeItem("demandflow-heatmap-interval");
      localStorage.removeItem("demandflow-slide-interval");
      localStorage.removeItem("demandflow-enabled-slides");
      localStorage.removeItem("demandflow-display-scaling");
      localStorage.removeItem("demandflow-tv-mode");
    } catch {}

    // 2. Fetch presentation profile and playlist items from MySQL
    fetch("/api/slides/presentations?slug=executive-presentation")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setPresentationId(res.data.id?.toString() || "1");
          if (res.data.defaultSlideSeconds) {
            setSlideInterval(res.data.defaultSlideSeconds);
            setCustomInputValue(String(res.data.defaultSlideSeconds));
          }

          if (Array.isArray(res.data.playlistItems) && res.data.playlistItems.length > 0) {
            setPlaylistItems(res.data.playlistItems);
            const slideMap: Record<number, boolean> = {};
            res.data.playlistItems.forEach((item: any, idx: number) => {
              slideMap[idx + 1] = item.isEnabled !== false;
            });
            setEnabledSlides(slideMap);
          }
        }
      })
      .catch((e) => console.error("Error loading presentation from MySQL:", e));

    // 3. Fetch display preferences from MySQL
    fetch("/api/slides/preferences")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.heatmapIntervalMinutes) {
            setHeatmapInterval(res.data.heatmapIntervalMinutes);
          }
          if (res.data.displayScaling) {
            setDisplayScaling(res.data.displayScaling);
          }
        }
      })
      .catch((e) => console.error("Error loading display preferences from MySQL:", e));
  }, []);

  const toggleSlide = (id: number) => {
    setEnabledSlides((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSlideIntervalChange = (valSec: number) => {
    const safeSec = Math.max(5, Math.min(600, valSec));
    setSlideInterval(safeSec);
    if (unit === "min") {
      setCustomInputValue(String(Number((safeSec / 60).toFixed(2))));
    } else {
      setCustomInputValue(String(safeSec));
    }
  };

  const handleCustomInput = (raw: string) => {
    setCustomInputValue(raw);
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;
    const computedSec = unit === "min" ? Math.round(parsed * 60) : Math.round(parsed);
    setSlideInterval(Math.max(5, Math.min(600, computedSec)));
  };

  const handleUnitToggle = (newUnit: "sec" | "min") => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === "min") {
      setCustomInputValue(String(Number((slideInterval / 60).toFixed(2))));
    } else {
      setCustomInputValue(String(slideInterval));
    }
  };

  const handleSave = async () => {
    try {
      // 1. Save presentation rotation interval in MySQL
      await fetch("/api/slides/presentations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: presentationId,
          defaultSlideSeconds: slideInterval,
        }),
      });

      // 2. Save playlist items (enabled/disabled states) in MySQL
      if (playlistItems.length > 0) {
        const updatedPlaylist = playlistItems.map((item, idx) => ({
          id: item.id,
          displayOrder: idx + 1,
          durationSeconds: slideInterval,
          isEnabled: enabledSlides[idx + 1] !== false,
        }));

        await fetch("/api/slides/playlists", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPlaylist),
        });
      }

      // 3. Save display preferences (scaling, heatmap interval) in MySQL
      await fetch("/api/slides/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heatmapIntervalMinutes: heatmapInterval,
          displayScaling: displayScaling,
          slideIntervalSeconds: slideInterval,
        }),
      });

      // 4. Update CRM sync config in MySQL
      if (updateConfig) {
        await updateConfig({
          slideRotationInterval: slideInterval,
          heatmapGranularity: heatmapInterval,
        });
      }

      // 5. Ensure any legacy localStorage remnants are permanently cleared
      try {
        localStorage.removeItem("demandflow-heatmap-interval");
        localStorage.removeItem("demandflow-slide-interval");
        localStorage.removeItem("demandflow-enabled-slides");
        localStorage.removeItem("demandflow-display-scaling");
      } catch {}

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err) {
      console.error("Failed to persist presentation settings to MySQL:", err);
      alert("Error saving settings to database. Please check server logs.");
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset presentation and display preferences back to defaults?")) {
      setSlideInterval(25);
      setCustomInputValue("25");
      setHeatmapInterval(10);
      setEnabledSlides({ 1: true, 2: true, 3: true, 4: true, 5: true });
      setDisplayScaling("tv-1080p");
      setScrollerEnabled(true);
      setScrollerMode("marquee");
      setScrollerSpeed("normal");
      setShowTopScorers(true);
      setShowBirthdays(true);
      setShowAnniversaries(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const activeSlidesCount = Object.values(enabledSlides).filter(Boolean).length;
  const totalLoopDurationSec = activeSlidesCount * slideInterval;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn max-w-[1750px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 mb-1.5">
            <Tv className="w-3 h-3 text-emerald-500" />
            Presentation & Floor Display Controller
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Presentation & TV Display Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure automated carousel timers, active slide sequences, display themes, celebration ribbon scrollers, and monitor resolution profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <Link
            href="/presentation"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Launch TV presentation in a new tab"
          >
            <Play className="w-3.5 h-3.5 text-cyan-500" />
            <span>Launch Presentation</span>
            <ExternalLink className="w-3 h-3 text-cyan-500/70" />
          </Link>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Save Notification Banner */}
      {saved && (
        <div className="p-3.5 rounded-xl text-xs bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-400/50 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              Display preferences saved successfully! Slide rotation intervals, active slide sequence, and theme settings have been updated across TV presentation mode and dashboard views.
            </span>
          </div>
        </div>
      )}

      {/* Executive Quick Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active Display Theme
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {isDark ? "Command Center (Dark)" : "Executive Daylight (Light)"}
            </span>
            <span className="text-[10px] text-slate-500">
              {isDark ? "Optimized for TV & floor displays" : "Optimized for bright conference rooms"}
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${isDark ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Carousel Rotation Loop
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {activeSlidesCount} Slides Active • {formatIntervalDisplay(slideInterval)} / slide
            </span>
            <span className="text-[10px] text-slate-500">
              Total cycle: {formatIntervalDisplay(totalLoopDurationSec)} per full loop
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Heatmap Granularity
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {heatmapInterval} Minute Shift Buckets
            </span>
            <span className="text-[10px] text-slate-500">
              {heatmapInterval === 10 ? 54 : Math.round(540 / heatmapInterval)} slots across 9hr operating shift
            </span>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Hardware Profile
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {displayScaling === "tv-1080p"
                ? "1080p Full HD Display"
                : displayScaling === "tv-4k"
                ? "4K Ultra-HD Wall Panel"
                : "Desktop / Laptop Scale"}
            </span>
            <span className="text-[10px] text-slate-500">
              Dynamic responsive scaling enabled
            </span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Monitor className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Grid: Responsive 12-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual Theme Selection Card */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold mb-1">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Application & TV Presentation Theme</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select your visual preference. Changes are applied instantly across the entire application, TV presentations, and saved across sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Option */}
              <div
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isDark
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/20"
                    : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#000000] text-cyan-400 border border-cyan-400/30 shadow-inner">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">Dark Mode (True Black)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Pure black #000000 background with high-contrast cyan & blue accents
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={isDark}
                      onChange={() => setTheme("dark")}
                      className="accent-cyan-500 cursor-pointer mt-1"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#000000] border border-cyan-500/50" />
                    <span className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-[10px] text-slate-400 font-mono ml-1">#000000 • True OLED Black</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                  Recommended for TV monitors, low-light operations floors, and night shifts.
                </div>
              </div>

              {/* Light Theme Option */}
              <div
                onClick={() => setTheme("light")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  !isDark
                    ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20"
                    : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-600/30 shadow-inner">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">Light Mode (Executive Daylight)</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Clean frosted white canvas with crisp contrast
                        </div>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="theme"
                      checked={!isDark}
                      onChange={() => setTheme("light")}
                      className="accent-amber-500 cursor-pointer mt-1"
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-sky-600" />
                    <span className="text-[10px] text-slate-500 font-mono ml-1">#f8fafc • Daylight Crisp</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                  Recommended for bright conference rooms, daylight offices, and executive reviews.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TV Presentation Quick Launch & Guide Card */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-cyan-500" />
                Live TV Presentation
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Ready to stream
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Launch Fullscreen Display
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Auto-advancing TV presentation carousel showing all 5 live operational slides with real-time CRM updates.
            </p>

            <Link
              href="/presentation"
              target="_blank"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 border border-cyan-400/30 flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Launch Live Presentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Keyboard className="w-3 h-3 text-cyan-500" />
              Keyboard Shortcuts Guide:
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span>Toggle Fullscreen</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[9px] font-bold border">F11</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span>Pause / Resume</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[9px] font-bold border">Space</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span>Previous / Next</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[9px] font-bold border">← / →</kbd>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span>Direct Slide Jump</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 font-mono text-[9px] font-bold border">1 - 5</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Slides Sequencing - Spans 12 Columns */}
        <div className="lg:col-span-12 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
            <div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-bold">
                <Layers className="w-4 h-4" />
                <span>Active Slide Sequence Selection</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle which operational slides participate in the automated TV rotation loop. Click any card to toggle.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {activeSlidesCount} of 5 slides participating
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
                {formatIntervalDisplay(totalLoopDurationSec)} cycle
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {[
              {
                id: 1,
                name: "Operations Overview",
                sub: "Hourly Leads, Target Gauges & Campaigns",
                icon: Activity,
                color: "text-cyan-500",
                bg: "bg-cyan-500/10",
              },
              {
                id: 2,
                name: "Agent Productivity",
                sub: "SDR Rankings, Velocity & QA Breakdown",
                icon: Trophy,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
              {
                id: 3,
                name: "QA 10m Heatmap",
                sub: "Quality Acceptance rates & hourly shift slots",
                icon: Shield,
                color: "text-purple-500",
                bg: "bg-purple-500/10",
              },
              {
                id: 4,
                name: "Agent Heatmap",
                sub: "Lead generation activity & shift distribution",
                icon: Flame,
                color: "text-rose-500",
                bg: "bg-rose-500/10",
              },
              {
                id: 5,
                name: "Comparative Analytics",
                sub: "Yesterday vs Today & Client Conversion",
                icon: Sliders,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
            ].map((slide) => {
              const isEnabled = enabledSlides[slide.id] ?? true;
              const Icon = slide.icon;

              return (
                <div
                  key={slide.id}
                  onClick={() => toggleSlide(slide.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                    isEnabled
                      ? "bg-white dark:bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/5 ring-1 ring-cyan-500/20"
                      : "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 opacity-55 hover:opacity-80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`p-2 rounded-lg ${slide.bg} ${slide.color} border border-current/20`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Slide {slide.id}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug mb-1">
                      {slide.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {slide.sub}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className={`font-semibold text-[11px] ${isEnabled ? "text-cyan-600 dark:text-cyan-400" : "text-slate-400"}`}>
                      {isEnabled ? "Participating" : "Skipped"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {}}
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Slide Rotation Interval Card (col-span-6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold">
                <Clock className="w-4 h-4" />
                <span>Automated Slide Rotation Interval</span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {formatIntervalDisplay(slideInterval)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Time elapsed before automatically rotating to the next active slide on TV presentation displays.
            </p>

            {/* Quick Presets */}
            <div className="mb-3">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "15s", sec: 15 },
                  { label: "20s", sec: 20 },
                  { label: "25s", sec: 25 },
                  { label: "30s", sec: 30 },
                  { label: "45s", sec: 45 },
                  { label: "1 min", sec: 60 },
                  { label: "2 min", sec: 120 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => handleSlideIntervalChange(item.sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      slideInterval === item.sec
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm font-bold"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input with Seconds / Minutes Toggle */}
            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Custom Duration:
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Configure rotation in exact seconds or minutes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={unit === "min" ? "0.1" : "1"}
                    min={unit === "min" ? "0.1" : "5"}
                    max={unit === "min" ? "10" : "600"}
                    value={customInputValue}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    className="w-20 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-cyan-500"
                    placeholder={unit === "min" ? "min" : "sec"}
                  />

                  <div className="flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleUnitToggle("sec")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        unit === "sec"
                          ? "bg-cyan-600 dark:bg-cyan-500 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Sec (s)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitToggle("min")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        unit === "min"
                          ? "bg-cyan-600 dark:bg-cyan-500 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Min (m)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Full carousel rotation cycle:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {formatIntervalDisplay(totalLoopDurationSec)} ({activeSlidesCount} slides)
            </span>
          </div>
        </div>

        {/* Heatmap Time Granularity Card (col-span-6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold">
                <Flame className="w-4 h-4 text-cyan-500" />
                <span>QA & Agent Heatmap Time Granularity</span>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                {heatmapInterval} min slots
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Shift time bucket width for both Slide 3 (QA Heatmap) and Slide 4 (Agent Heatmap).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { val: 5, label: "5 Minutes", slots: 108, badge: "High Detail" },
                { val: 10, label: "10 Minutes", slots: 54, badge: "Default" },
                { val: 15, label: "15 Minutes", slots: 36, badge: "Quarter-Hour" },
                { val: 30, label: "30 Minutes", slots: 18, badge: "Half-Hour" },
                { val: 60, label: "60 Minutes", slots: 9, badge: "Hourly" },
              ].map((item) => {
                const isActive = heatmapInterval === item.val;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setHeatmapInterval(item.val)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-sm ring-1 ring-cyan-500/30"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          isActive
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                      {item.slots} shift slots
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Operating shift span:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              9 Hours (540 total shift minutes)
            </span>
          </div>
        </div>

        {/* Display Resolution & Scale Profile (col-span-6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-sm font-bold mb-1">
              <Tv className="w-4 h-4" />
              <span>Display Resolution & Scale Profile</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Visual rendering scale tailored to target monitor hardware and viewing distance.
            </p>

            <div className="flex flex-col gap-2.5">
              {[
                {
                  id: "tv-1080p",
                  title: "1080p Full HD Display (Recommended)",
                  desc: "1920×1080 floor TV displays and mounted operations dashboards",
                },
                {
                  id: "tv-4k",
                  title: "4K Ultra-HD Display",
                  desc: "3840×2160 large wall panels and high-DPI executive screens",
                },
                {
                  id: "desktop",
                  title: "Standard Desktop / Laptop",
                  desc: "1440×900 to 1920×1080 workstation browsing",
                },
              ].map((prof) => (
                <label
                  key={prof.id}
                  onClick={() => setDisplayScaling(prof.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    displayScaling === prof.id
                      ? "bg-purple-500/15 border-purple-500 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/30"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{prof.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{prof.desc}</div>
                  </div>
                  <input
                    type="radio"
                    name="profile"
                    checked={displayScaling === prof.id}
                    onChange={() => setDisplayScaling(prof.id)}
                    className="accent-purple-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Live Recognition & Celebrations Scroller Controls (col-span-6) */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
              <div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-bold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Celebrations Ribbon Scroller Controls</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automated ribbon ticker showing Top Leads Scored, Birthdays, and Work Anniversaries.
                </p>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <span className={scrollerEnabled ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400"}>
                  {scrollerEnabled ? "Enabled" : "Disabled"}
                </span>
                <input
                  type="checkbox"
                  checked={scrollerEnabled}
                  onChange={(e) => setScrollerEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              {/* Display Mode */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Ticker Flow Mode
                  </span>
                  <p className="text-[10px] text-slate-500 mb-2.5">
                    Continuous flowing marquee or spotlight card slider.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScrollerMode("marquee")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        scrollerMode === "marquee"
                          ? "bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Marquee Ticker
                    </button>
                    <button
                      type="button"
                      onClick={() => setScrollerMode("slider")}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        scrollerMode === "slider"
                          ? "bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      Card Slider
                    </button>
                  </div>
                </div>
              </div>

              {/* Scroll Velocity */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Ticker Gliding Speed
                  </span>
                  <p className="text-[10px] text-slate-500 mb-2.5">
                    Adjust horizontal gliding velocity for large display readability.
                  </p>
                  <div className="flex gap-1.5">
                    {(["slow", "normal", "fast"] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setScrollerSpeed(spd)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                          scrollerSpeed === spd
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-800 dark:text-cyan-300 shadow-sm font-bold"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Celebratory Modules Included */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                Active Celebratory Feeds:
              </span>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showTopScorers}
                    onChange={(e) => setShowTopScorers(e.target.checked)}
                    className="accent-amber-500 cursor-pointer"
                  />
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Top Leads Scored</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showBirthdays}
                    onChange={(e) => setShowBirthdays(e.target.checked)}
                    className="accent-rose-500 cursor-pointer"
                  />
                  <Cake className="w-3.5 h-3.5 text-rose-500" />
                  <span>Birthdays</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={showAnniversaries}
                    onChange={(e) => setShowAnniversaries(e.target.checked)}
                    className="accent-cyan-500 cursor-pointer"
                  />
                  <Award className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Work Anniversaries</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Bottom Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>
            Presentation preferences persist across browser reloads and sync with backend CRM configurations dynamically.
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 border border-emerald-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
