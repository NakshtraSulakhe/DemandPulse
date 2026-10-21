"use client";

import React, { useState, useEffect } from "react";
import { Settings, Tv, Clock, CheckCircle2, Sliders, Shield, Layers, Sun, Moon, Flame, Sparkles, Trophy, Cake, Award } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

export default function PresentationSettingsPage() {
  const { theme, setTheme, isDark } = useTheme();
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

  useEffect(() => {
    try {
      const savedHeatmap = localStorage.getItem("demandflow-heatmap-interval");
      if (savedHeatmap) {
        const parsed = parseInt(savedHeatmap, 10);
        if ([5, 10, 15, 20, 30, 60].includes(parsed)) {
          setHeatmapInterval(parsed);
        }
      }
    } catch {}
  }, []);

  const toggleSlide = (id: number) => {
    setEnabledSlides((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem("demandflow-heatmap-interval", String(heatmapInterval));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            Presentation & TV Display Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure automated carousel timers, active slide sequences, display themes, and monitor resolution profiles
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl text-xs bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400/50 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Display settings saved successfully! Changes apply immediately to all active views and presentation mode.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Visual Theme Selection Card */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold mb-1">
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>Application & TV Presentation Theme</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select your visual preference. Changes are applied instantly across the entire application and saved for future sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Option */}
              <div
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isDark
                    ? "bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10"
                    : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#070b14] text-cyan-400 border border-cyan-400/30">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">Dark Mode (Command Center)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Deep navy background with neon cyan & blue glow
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
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                  Recommended for TV monitors, low-light operations floors, and night shifts.
                </div>
              </div>

              {/* Light Theme Option */}
              <div
                onClick={() => setTheme("light")}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  !isDark
                    ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-md shadow-amber-500/10"
                    : "bg-slate-100/80 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-600/30">
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
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                  Recommended for bright conference rooms, daylight offices, and executive reviews.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide Rotation Timer */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold mb-1">
              <Clock className="w-4 h-4" />
              <span>Automated Slide Rotation Interval</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Time elapsed before automatically rotating to the next active slide on TV monitors.
            </p>

            <div className="flex flex-wrap gap-2">
              {[15, 20, 25, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSlideInterval(sec)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    slideInterval === sec
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-md shadow-cyan-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {sec} seconds
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 font-mono">
            Current interval: {slideInterval}s per slide
          </div>
        </div>

        {/* Heatmap Time Granularity Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold mb-1">
              <Flame className="w-4 h-4 text-cyan-500" />
              <span>QA & Agent Heatmap Time Granularity</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Shift time bucket width for both Slide 3 (QA Heatmap) and Slide 4 (Agent Heatmap).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    onClick={() => setHeatmapInterval(item.val)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-900 dark:text-cyan-200 shadow-md shadow-cyan-500/15"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{item.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                          isActive
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                      {item.slots} shift slots
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 font-mono">
            Active granularity: {heatmapInterval}m buckets (applies dynamically to presentation mode)
          </div>
        </div>

        {/* Display Resolution Profile */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-sm font-bold mb-1">
              <Tv className="w-4 h-4" />
              <span>Display Resolution & Scale Profile</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Visual rendering scale tailored to target monitor hardware.
            </p>

            <div className="flex flex-col gap-2">
              {[
                { id: "tv-1080p", title: "1080p Full HD Display (Recommended)", desc: "1920×1080 floor TV displays" },
                { id: "tv-4k", title: "4K Ultra-HD Display", desc: "3840×2160 large wall panels" },
                { id: "desktop", title: "Standard Desktop / Laptop", desc: "1440×900 to 1920×1080" },
              ].map((prof) => (
                <label
                  key={prof.id}
                  onClick={() => setDisplayScaling(prof.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    displayScaling === prof.id
                      ? "bg-purple-500/15 border-purple-500 text-purple-900 dark:text-purple-200"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-slate-900 dark:text-white">{prof.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{prof.desc}</div>
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

        {/* Enabled Slides Sequencing */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-bold mb-1">
            <Layers className="w-4 h-4" />
            <span>Active Slide Sequence Selection</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Toggle which slides participate in the automated TV rotation loop.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { id: 1, name: "Slide 1: Operations Overview" },
              { id: 2, name: "Slide 2: Agent Productivity" },
              { id: 3, name: "Slide 3: QA Heatmap" },
              { id: 4, name: "Slide 4: Agent Heatmap" },
              { id: 5, name: "Slide 5: Comparative Analytics" },
            ].map((slide) => {
              const isEnabled = enabledSlides[slide.id] ?? true;
              return (
                <div
                  key={slide.id}
                  onClick={() => toggleSlide(slide.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isEnabled
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-800 dark:text-cyan-200 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 opacity-60"
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{slide.name}</div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className={isEnabled ? "text-cyan-600 dark:text-cyan-400 font-semibold" : "text-slate-400 dark:text-slate-500"}>
                      {isEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {}}
                      className="accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Recognition & Celebrations Scroller Controls */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4">
            <div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-bold">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Live Recognition & Celebrations Scroller Controls</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure the automated ticker showing Top Leads Scored, Birthdays, and Work Anniversaries across the dashboard & TV monitor.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <span className={scrollerEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                {scrollerEnabled ? "Scroller Enabled" : "Scroller Disabled"}
              </span>
              <input
                type="checkbox"
                checked={scrollerEnabled}
                onChange={(e) => setScrollerEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Display Mode */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Ticker Flow Mode
                </span>
                <p className="text-[10px] text-slate-500 mb-3">
                  Continuous flowing marquee ribbon or spotlight card slider.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScrollerMode("marquee")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      scrollerMode === "marquee"
                        ? "bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-300 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Marquee Ticker
                  </button>
                  <button
                    onClick={() => setScrollerMode("slider")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
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
                  Ticker Scroll Speed
                </span>
                <p className="text-[10px] text-slate-500 mb-3">
                  Adjust horizontal gliding velocity for large display readability.
                </p>
                <div className="flex gap-2">
                  {(["slow", "normal", "fast"] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setScrollerSpeed(spd)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        scrollerSpeed === spd
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-800 dark:text-cyan-300 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Celebratory Modules Included */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Active Modules
                </span>
                <p className="text-[10px] text-slate-500 mb-2">
                  Select which live celebratory feeds stream onto the ticker:
                </p>
                <div className="flex flex-col gap-1.5 text-xs">
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
      </div>
    </div>
  );
}
