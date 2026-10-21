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
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";

interface SlideComparativeAnalyticsProps {
  data?: Slide5Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export default function SlideComparativeAnalytics({
  data,
  isLoading,
  error,
  onRetry,
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

  const rawTimeline = data?.comparison_timeline || [];

  // Downsample or filter timeline for clean chart rendering (every 2nd slot or all)
  const chartData = rawTimeline.map((item) => ({
    time: item.time_label.split(" - ")[0],
    generated: item.leads_generated,
    audited: item.leads_audited,
    qualified: item.leads_qualified,
    disqualified: item.leads_disqualified,
    cumGenerated: item.cumulative_generated,
    cumAudited: item.cumulative_audited,
    cumQualified: item.cumulative_qualified,
    gap: item.pending_backlog_delta,
  }));

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-8 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[480px]">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-white mb-1">CRM Comparative Analytics API Error</h3>
        <p className="text-xs text-rose-300 max-w-lg mb-4">{error.message}</p>
        <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-slate-400 mb-5 max-w-md text-left">
          <span className="text-slate-300 font-semibold block mb-1">Upstream CRM Endpoint:</span>
          <code className="text-cyan-300 font-mono block">GET /api/v1/slides/slide5.php</code>
          <code className="text-cyan-300 font-mono block">GET /api/v1/slides_analytics.php?action=slide5</code>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/20"
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
      <div className="w-full h-full flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Fetching live Comparative Analytics from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 p-2 animate-fadeIn">
      {/* 6 Key Comparative Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {/* Total Generated */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Generated</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-slate-900 dark:text-cyan-300 tv-stat-number tv-stat-number-cyan tracking-tight">
            {formatNumber(summary.total_leads_generated)}
          </div>
          <p className="text-xs xl:text-sm text-cyan-600 dark:text-cyan-400 font-semibold mt-1">Outbound floor leads</p>
        </div>

        {/* Total Audited */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Audited</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-purple-700 dark:text-purple-300 tv-stat-number tv-stat-number-purple tracking-tight">
            {formatNumber(summary.total_leads_audited)}
          </div>
          <p className="text-xs xl:text-sm text-purple-600 dark:text-purple-400 font-semibold mt-1">QA reviewed total</p>
        </div>

        {/* Total Qualified */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Qualified</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-emerald-600 dark:text-emerald-400 tv-stat-number tv-stat-number-emerald tracking-tight">
            {formatNumber(summary.total_leads_qualified)}
          </div>
          <p className="text-xs xl:text-sm text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Passed criteria</p>
        </div>

        {/* Disqualified */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Disqualified</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-rose-600 dark:text-rose-400 tv-stat-number tv-stat-number-rose tracking-tight">
            {formatNumber(summary.total_leads_disqualified)}
          </div>
          <p className="text-xs xl:text-sm text-rose-600 dark:text-rose-400 font-semibold mt-1">Failed criteria</p>
        </div>

        {/* Pending QA Gap */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Audit Backlog</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-amber-600 dark:text-amber-400 tv-stat-number tv-stat-number-amber tracking-tight">
            {formatNumber(summary.pending_audit_gap)}
          </div>
          <p className="text-xs xl:text-sm text-amber-600 dark:text-amber-400 font-semibold mt-1">Pending in QA queue</p>
        </div>

        {/* Turnaround Rate */}
        <div className="glass-panel p-4 xl:p-5 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">Audit Velocity</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl xl:text-5xl font-black text-blue-700 dark:text-blue-300 tv-stat-number tracking-tight">
            {formatPercent(summary.audit_turnaround_rate)}
          </div>
          <p className="text-xs xl:text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
            {formatPercent(summary.qualification_approval_rate)} QA pass rate
          </p>
        </div>
      </div>

      {/* Main Comparative Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interval Comparison Chart (Leads Generated vs Audited vs Qualified) */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 mb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                Shift Timeline: Outbound Generation vs QA Qualification
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Pacing comparison across all shift intervals (09:30 - 18:30)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Generated
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Audited
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Qualified
              </span>
            </div>
          </div>

          <div className="w-full h-[380px] xl:h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? "#94a3b8" : "#475569"}
                  fontSize={12}
                  fontWeight={600}
                  interval={3}
                  tickLine={false}
                />
                <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={12} fontWeight={600} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(203, 213, 225, 0.9)",
                    borderRadius: "0.75rem",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: isDark ? "#fff" : "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{
                    color: isDark ? "#e2e8f0" : "#334155",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="generated"
                  name="Generated Leads"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorGen)"
                />
                <Area
                  type="monotone"
                  dataKey="audited"
                  name="Audited Leads"
                  stroke="#c084fc"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAud)"
                />
                <Area
                  type="monotone"
                  dataKey="qualified"
                  name="Qualified Leads"
                  stroke="#34d399"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorQual)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cumulative Funnel Trajectory */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col">
          <div className="pb-3 border-b border-slate-200/80 dark:border-white/10 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              Cumulative Funnel Trajectory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Production vs verified qualification</p>
          </div>

          <div className="w-full h-[380px] xl:h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                <XAxis
                  dataKey="time"
                  stroke={isDark ? "#94a3b8" : "#475569"}
                  fontSize={12}
                  fontWeight={600}
                  interval={6}
                  tickLine={false}
                />
                <YAxis stroke={isDark ? "#94a3b8" : "#475569"} fontSize={12} fontWeight={600} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
                    borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(203, 213, 225, 0.9)",
                    borderRadius: "0.75rem",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: isDark ? "#fff" : "#0f172a",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
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
                  strokeWidth={3.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumQualified"
                  name="Cum. Qualified"
                  stroke="#34d399"
                  strokeWidth={3.5}
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
