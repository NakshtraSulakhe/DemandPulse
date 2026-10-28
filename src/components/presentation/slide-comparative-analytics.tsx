"use client";

import React from "react";
import { Slide5Data } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import SlideDateFilter from "@/components/presentation/slide-date-filter";

interface SlideComparativeAnalyticsProps {
  data?: Slide5Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  selectedDate?: string;
  onDateChange?: (date: string | undefined) => void;
  onApplyDateToAll?: (date: string) => void;
}

export default function SlideComparativeAnalytics({
  data,
  isLoading,
  error,
  onRetry,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: SlideComparativeAnalyticsProps) {
  const { isDark } = useTheme();

  const summary = data?.summary || {
    total_leads_generated: 0,
    total_leads_audited: 0,
    total_leads_qualified: 0,
    total_leads_disqualified: 0,
    pending_audit_gap: 0,
    audit_turnaround_rate: 0,
    qualification_approval_rate: 0,
  };

  const timeline = data?.comparison_timeline || [];

  // Cumulative timeline tracking for the shift
  let cumGen = 0;
  let cumQual = 0;
  let cumAud = 0;
  const chartData = timeline.map((slot) => {
    const gen = slot.leads_generated ?? 0;
    const aud = slot.leads_audited ?? 0;
    const qual = slot.leads_qualified ?? 0;
    cumGen += gen;
    cumAud += aud;
    cumQual += qual;
    return {
      time: slot.time_label ? slot.time_label.split(" - ")[0] : "",
      generated: gen,
      audited: aud,
      qualified: qual,
      cumGenerated: cumGen,
      cumAudited: cumAud,
      cumQualified: cumQual,
    };
  });

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM Comparative Analytics API Error</h3>
        <p className="text-xs text-rose-300 max-w-lg mb-3">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Retry Fetching Live CRM Data</span>
          </button>
        )}
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[420px]">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Fetching live Comparative Analytics from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3.5 p-1 animate-fadeIn">
      {/* Top Banner with Slide Title and Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Slide 5 • Comparative Velocity & Audit Analytics
          </span>
          {data?.query_date && (
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-cyan-700 dark:text-cyan-400">
              Shift Date: {data.query_date}
            </span>
          )}
        </div>

        {onDateChange && (
          <SlideDateFilter
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onApplyToAll={onApplyDateToAll}
            showApplyToAll={!!onApplyDateToAll}
          />
        )}
      </div>

      {/* 6 Key Comparative Metric Cards - Reduced compact sizing */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 lg:gap-3">
        {/* Total Generated */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Generated</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 dark:text-cyan-300 tv-stat-number tv-stat-number-cyan tracking-tight">
            {formatNumber(summary.total_leads_generated)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">Outbound leads</p>
        </div>

        {/* Total Audited */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-purple-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Audited</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-purple-700 dark:text-purple-300 tv-stat-number tv-stat-number-purple tracking-tight">
            {formatNumber(summary.total_leads_audited)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">QA reviewed</p>
        </div>

        {/* Total Qualified */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Qualified</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tv-stat-number tv-stat-number-emerald tracking-tight">
            {formatNumber(summary.total_leads_qualified)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Passed criteria</p>
        </div>

        {/* Disqualified */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-rose-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Disqualified</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tv-stat-number tv-stat-number-rose tracking-tight">
            {formatNumber(summary.total_leads_disqualified)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">Failed criteria</p>
        </div>

        {/* Pending QA Gap */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-amber-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Backlog</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tv-stat-number tv-stat-number-amber tracking-tight">
            {formatNumber(summary.pending_audit_gap)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Pending queue</p>
        </div>

        {/* Turnaround Rate */}
        <div className="glass-panel p-3 xl:p-3.5 rounded-xl relative overflow-hidden group hover:border-blue-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-wider">Audit Pass</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-blue-700 dark:text-blue-300 tv-stat-number tracking-tight">
            {formatPercent(summary.audit_turnaround_rate)}
          </div>
          <p className="text-[10px] xl:text-[10.5px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
            {formatPercent(summary.qualification_approval_rate)} pass
          </p>
        </div>
      </div>

      {/* Main Comparative Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Interval Comparison Chart (Leads Generated vs Audited vs Qualified) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-4 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col">
          <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10 mb-2 gap-2">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Shift Timeline: Outbound Generation vs QA Qualification
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pacing comparison across shift intervals (17:30 - 02:30)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> Generated
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Audited
              </span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Qualified
              </span>
            </div>
          </div>

          <div className="w-full h-[320px] xl:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? "#94a3b8" : "#475569"}
                  fontSize={10.5}
                  fontWeight={600}
                  interval={3}
                  tickLine={false}
                />
                <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10.5} fontWeight={600} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(203, 213, 225, 0.9)",
                    borderRadius: "0.5rem",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isDark ? "#fff" : "#0f172a",
                    boxShadow: "0 6px 15px -3px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{
                    color: isDark ? "#e2e8f0" : "#334155",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="generated"
                  name="Generated"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGen)"
                />
                <Area
                  type="monotone"
                  dataKey="audited"
                  name="Audited"
                  stroke="#c084fc"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAud)"
                />
                <Area
                  type="monotone"
                  dataKey="qualified"
                  name="Qualified"
                  stroke="#34d399"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorQual)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Funnel Trajectory */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-4 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col">
          <div className="pb-2.5 border-b border-slate-200/80 dark:border-white/10 mb-2">
            <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Cumulative Funnel Trajectory
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Production vs verified qualification</p>
          </div>

          <div className="w-full h-[320px] xl:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? "#94a3b8" : "#475569"}
                  fontSize={10.5}
                  fontWeight={600}
                  interval={6}
                  tickLine={false}
                />
                <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={10.5} fontWeight={600} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(203, 213, 225, 0.9)",
                    borderRadius: "0.5rem",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isDark ? "#fff" : "#0f172a",
                    boxShadow: "0 6px 15px -3px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{
                    color: isDark ? "#e2e8f0" : "#334155",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumGenerated"
                  name="Cum. Generated"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumQualified"
                  name="Cum. Qualified"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
