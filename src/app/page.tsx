"use client";

import React from "react";
import Link from "next/link";
import { Tv, SlidersHorizontal, Activity, ArrowRight, ShieldCheck, Zap, BarChart3, Shield } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background ambient lighting */}
      <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-[20%] right-[20%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-60 dark:opacity-40" />

      {/* Floating Top Nav with Theme Switcher */}
      <header className="absolute top-6 left-6 right-6 max-w-5xl mx-auto flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center border border-cyan-400/30 shadow-md shadow-cyan-500/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-sm text-slate-900 dark:text-white">DemandFlow</span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="pill" />
          <Link
            href="/admin"
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
          >
            Admin Portal
          </Link>
        </div>
      </header>

      <div className="w-full max-w-3xl flex flex-col items-center text-center relative z-10 animate-fadeIn mt-12 sm:mt-0">
        {/* Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 mb-6 shadow-sm">
          <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-600 dark:text-cyan-400" />
          <span>DemandFlow Live Analytics • Operations Center</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Real-Time Operations & <br />
          <span className="gradient-text-cyan">QA Analytics Center</span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
          Full-screen automated 5-slide operations presentation, SDR points productivity, 10-minute interval heatmaps, and campaign daily target allocations synced directly with DemandFlow Bridge CRM.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/presentation"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-600/30 border border-cyan-400/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            <span>Launch Live TV Presentation</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin/campaign-targets"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl glass-panel hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-300 dark:border-white/10 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Campaign Daily Targets (Admin)</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 w-fit mb-2.5">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">5 Live Slides</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Operations overview, agent points rotation, QA heatmap, agent heatmap & comparative analytics.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Live Sync & Polling</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              TanStack Query with 30s auto-refresh, no-cache upstream fetching, and dark/light mode visual adaptation.
            </p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 w-fit mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Dual Mode Display</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Switch effortlessly between dark command center mode for TV displays and clean daylight mode for daytime reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
