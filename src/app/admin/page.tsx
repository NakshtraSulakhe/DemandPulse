"use client";

import React from "react";
import Link from "next/link";
import {
  Target,
  History,
  Tv,
  Settings,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowRight,
  Database,
  Users,
  Server,
  Radio,
  Zap,
} from "lucide-react";
import { useCrmConfig } from "@/hooks/use-crm-config";

export default function AdminDashboardPage() {
  const { config, triggerInstantSync } = useCrmConfig();

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 mb-2">
              <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-600 dark:text-cyan-400" />
              DemandFlow Bridge Operations Hub
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Analytics Administration & Target Center
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Configure daily SDR & Campaign target allocations, monitor live floor attendance, control display presentation rotation parameters, and configure CRM REST API synchronization intervals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm-config"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <Server className="w-3.5 h-3.5 text-cyan-500" />
              <span>Configure CRM API</span>
            </Link>

            <Link
              href="/presentation"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/25 border border-cyan-400/30 transition-all cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Open Live TV Presentation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Feature Cards - 4 Column Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Daily Campaign Targets */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
          <div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 w-fit mb-3">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              Daily Targets
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Fetch active CRM campaigns, configure daily lead targets, and dynamically calculate remaining quotas reflected on Slide 1.
            </p>
          </div>
          <Link
            href="/admin/campaign-targets"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 pt-3 border-t border-slate-200/60 dark:border-white/5 cursor-pointer"
          >
            <span>Manage Daily Targets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 2: CRM API & Sync Cadence */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between hover:border-blue-500/40 transition-all group">
          <div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 w-fit mb-3 flex items-center justify-between">
              <Server className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
              CRM & Sync Intervals
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Configure CRM API Base URL, Bearer tokens, test upstream endpoint latency, and adjust live polling intervals ({config.analyticsSyncInterval}s cadence).
            </p>
          </div>
          <Link
            href="/admin/crm-config"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 pt-3 border-t border-slate-200/60 dark:border-white/5 cursor-pointer"
          >
            <span>Configure CRM & Sync</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 3: Target Allocation History */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
          <div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 w-fit mb-3">
              <History className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
              Target History
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Inspect historical target allocations by date and campaign to audit sprint completion and quota consistency over time.
            </p>
          </div>
          <Link
            href="/admin/target-history"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 pt-3 border-t border-slate-200/60 dark:border-white/5 cursor-pointer"
          >
            <span>View Target History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Card 4: Display & Rotation Settings */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between hover:border-emerald-500/40 transition-all group">
          <div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit mb-3">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
              Display & Rotation
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Customize automated slide rotation duration, select enabled slides, and fine-tune TV full-screen scaling and display preferences.
            </p>
          </div>
          <Link
            href="/admin/presentation-settings"
            className="mt-4 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 pt-3 border-t border-slate-200/60 dark:border-white/5 cursor-pointer"
          >
            <span>Configure Presentation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* CRM Architecture Diagnostics & API Status */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10 mb-4 gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Active CRM Architecture & Upstream Sync Status
          </h2>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              config.autoSyncEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
            }`}>
              <Radio className="w-3 h-3 animate-pulse" />
              {config.autoSyncEnabled ? `Polling Active (${config.analyticsSyncInterval}s)` : "Polling Paused"}
            </span>

            <Link
              href="/admin/crm-config"
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              Edit Settings →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Configured CRM API Base</span>
            <span className="font-mono text-cyan-700 dark:text-cyan-300 text-xs truncate block" title={config.crmApiBaseUrl}>
              {config.crmApiBaseUrl}
            </span>
            <span className="block mt-1 text-[10px] text-slate-500">
              {config.crmApiToken ? "Token Auth: Enabled" : "Token Auth: None"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Slide Analytics Interval</span>
            <span className="font-mono text-cyan-700 dark:text-cyan-300 text-xs font-bold">
              {config.analyticsSyncInterval} seconds
            </span>
            <span className="block mt-1 text-[10px] text-slate-500">
              ~{Math.round(3600 / config.analyticsSyncInterval)} sync polls / hr
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Failover Mode</span>
            <span className={`font-mono text-xs font-bold ${config.crmMockFallback ? "text-purple-600 dark:text-purple-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {config.crmMockFallback ? "Mock Fallback Active" : "Strict Live API"}
            </span>
            <span className="block mt-1 text-[10px] text-slate-500">
              {config.crmMockFallback ? "Simulates data if CRM is down" : "Pass-through CRM responses"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Celebration Ticker Cadence</span>
            <span className="font-mono text-amber-700 dark:text-amber-300 text-xs font-bold">
              {config.recognitionSyncInterval} seconds
            </span>
            <span className="block mt-1 text-[10px] text-slate-500">
              Top scorers, birthdays & anniversaries
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
