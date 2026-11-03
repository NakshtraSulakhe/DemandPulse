"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Slide4Data, AgentHeatmapItem, AgentHeatmapInterval } from "@/types";
import { formatNumber } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  Users,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  Flame,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";
import { useTheme } from "@/components/providers/theme-provider";
import SlideDateFilter from "@/components/presentation/slide-date-filter";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface SlideAgentHeatmapProps {
  data?: Slide4Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  interval?: number;
  onIntervalChange?: (newInterval: number) => void;
  rowsPerPage?: number;
  selectedDate?: string;
  onDateChange?: (date: string | undefined) => void;
  onApplyDateToAll?: (date: string) => void;
}

export default function SlideAgentHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval = 30,
  onIntervalChange,
  rowsPerPage = 8,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: SlideAgentHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("matrix");
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Sort agents by total leads generated descending
  const agents: AgentHeatmapItem[] = useMemo(() => {
    const raw = data?.agent_heatmap || [];
    return [...raw].sort((a, b) => {
      const diff = (b.total_generated || 0) - (a.total_generated || 0);
      if (diff !== 0) return diff;
      return a.agent_name.localeCompare(b.agent_name);
    });
  }, [data?.agent_heatmap]);

  // Precompute floor rank map for top 3 and bottom 3 performers
  const agentRankMap = useMemo(() => {
    const map = new Map<number, { rank: number; isTop3: boolean; isBottom3: boolean }>();
    const total = agents.length;
    agents.forEach((agent, index) => {
      const rank = index + 1;
      const isTop3 = index < 3;
      const isBottom3 = total >= 6 && index >= total - 3;
      map.set(agent.agent_id, { rank, isTop3, isBottom3 });
    });
    return map;
  }, [agents]);

  // Group agents into rotating frames (sub-slides, 8 per frame by default)
  const chunks: Array<AgentHeatmapItem[]> = useMemo(() => {
    const res: Array<AgentHeatmapItem[]> = [];
    for (let i = 0; i < agents.length; i += rowsPerPage) {
      res.push(agents.slice(i, i + rowsPerPage));
    }
    return res;
  }, [agents, rowsPerPage]);

  const totalPages = Math.max(1, chunks.length);

  // Auto carousel frame rotation (12s per frame, identical to Agent Productivity Slide 2)
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(timer);
  }, [totalPages]);

  // Keep activePageIndex within valid bounds if dataset changes
  useEffect(() => {
    if (activePageIndex >= totalPages) {
      setActivePageIndex(0);
    }
  }, [totalPages, activePageIndex]);

  const currentAgents = chunks[activePageIndex] || [];

  const intervals: AgentHeatmapInterval[] = agents[0]?.intervals || [];
  const totalAgents = data?.total_agents || agents.length;
  const totalGenerated = agents.reduce((acc: number, a: AgentHeatmapItem) => acc + (a.total_generated || 0), 0);
  const intervalMinutes = data?.interval_minutes || interval;
  const totalIntervals = data?.total_intervals || intervals.length;

  // Prepare ECharts heatmap configuration for current frame agents
  const chartOption = useMemo(() => {
    const targetAgents = currentAgents.length > 0 ? currentAgents : agents;
    const timeLabels = intervals.map((i: AgentHeatmapInterval) => i.time_label.split(" - ")[0]);
    const agentNames = targetAgents.map((a: AgentHeatmapItem) => a.agent_name);

    const labelInterval =
      intervals.length <= 12 ? 0 : intervals.length <= 24 ? 1 : intervals.length <= 40 ? 2 : intervals.length <= 60 ? 3 : 5;

    const seriesData: [number, number, number, string][] = [];
    let maxVal = 1;

    targetAgents.forEach((agent: AgentHeatmapItem, yIdx: number) => {
      agent.intervals.forEach((inv: AgentHeatmapInterval, xIdx: number) => {
        const val = inv.generated_count || 0;
        if (val > maxVal) maxVal = val;
        seriesData.push([xIdx, yIdx, val, inv.time_label]);
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(168, 85, 247, 0.6)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 11 },
        formatter: (params: { data: [number, number, number, string] }) => {
          const [xIdx, yIdx, val, timeLabel] = params.data;
          const agentName = agentNames[yIdx];
          const primaryColor = isDark ? "#c084fc" : "#7e22ce";
          const mutedColor = isDark ? "#94a3b8" : "#64748b";
          const highlightColor = isDark ? "#38bdf8" : "#0284c7";
          return `
            <div style="font-weight: 700; color: ${primaryColor}; margin-bottom: 3px;">${agentName}</div>
            <div style="color: ${mutedColor}; font-size: 10px; margin-bottom: 4px;">Slot: ${timeLabel}</div>
            <div style="font-size: 11px;">
              <span>Generated: <b style="color: ${highlightColor};">${val} leads</b></span>
            </div>
          `;
        },
      },
      grid: {
        top: 15,
        bottom: 50,
        left: 140,
        right: 30,
      },
      xAxis: {
        type: "category",
        data: timeLabels,
        splitArea: { show: true, areaStyle: { color: isDark ? ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.02)"] : ["rgba(0,0,0,0.01)", "rgba(0,0,0,0.02)"] } },
        axisLabel: {
          color: isDark ? "#94a3b8" : "#475569",
          fontSize: 10.5,
          fontWeight: 600,
          interval: labelInterval,
          rotate: 35,
        },
        axisLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" } },
      },
      yAxis: {
        type: "category",
        data: agentNames,
        axisLabel: {
          color: isDark ? "#e2e8f0" : "#1e293b",
          fontSize: 12,
          fontWeight: 700,
        },
        axisLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" } },
        splitLine: { show: true, lineStyle: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" } },
      },
      visualMap: {
        type: "piecewise",
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 16,
        itemHeight: 12,
        itemGap: 12,
        textStyle: { color: isDark ? "#cbd5e1" : "#475569", fontSize: 11, fontWeight: "bold" },
        pieces: [
          { min: 5, label: "5+ (Peak Burst)", color: "#10b981" },
          { min: 4, max: 4, label: "4 (Very High)", color: "#84cc16" },
          { min: 3, max: 3, label: "3 (High)", color: "#f59e0b" },
          { min: 2, max: 2, label: "2 (Moderate)", color: "#f97316" },
          { min: 1, max: 1, label: "1 (Low)", color: "#ef4444" },
          { max: 0, label: "0 (Quiet)", color: isDark ? "rgba(30, 41, 59, 0.45)" : "rgba(241, 245, 249, 0.85)" },
        ],
      },
      series: [
        {
          name: "Generated Leads",
          type: "heatmap",
          data: seriesData,
          itemStyle: {
            borderColor: isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(255, 255, 255, 0.6)",
            borderWidth: 1,
            borderRadius: 3,
          },
          label: {
            show: true,
            fontSize: 10.5,
            fontWeight: "bold",
            color: (p: { data: [number, number, number] }) => {
              const val = p.data[2];
              if (val === 3 || val === 4) return "#0f172a";
              return "#ffffff";
            },
            formatter: (p: { data: [number, number, number] }) => (p.data[2] > 0 ? String(p.data[2]) : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [currentAgents, agents, intervals, isDark]);

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM Agent Heatmap API Error</h3>
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
          <p className="text-xs text-slate-400">Fetching live Agent Heatmap from CRM API...</p>
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
            Slide 4 • Agent Lead Generation Heatmap
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

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lead Gen Agents
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-purple-600 dark:text-purple-300 mt-1.5 tv-stat-number tv-stat-number-purple">
              {totalAgents} <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Rostered</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active outbound SDRs</p>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Generated Leads
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-1.5 tv-stat-number tv-stat-number-cyan">
              {formatNumber(totalGenerated)} <span className="text-xs text-cyan-500 dark:text-cyan-300 font-bold">Leads</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Floor production today</p>
          </div>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Leads / SDR
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5 tv-stat-number tv-stat-number-amber">
              {totalAgents > 0 ? (totalGenerated / totalAgents).toFixed(1) : 0}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Individual throughput</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shift Intervals
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 tv-stat-number tv-stat-number-emerald">
              {totalIntervals} <span className="text-xs text-emerald-500 dark:text-emerald-300 font-bold">Slots</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{intervalMinutes}-minute time buckets</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Heatmap Container */}
      <div className="glass-panel rounded-xl p-3 sm:p-4 border border-white/10 shadow-lg flex flex-col">
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-white/10 mb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              Agent Lead Generation {intervalMinutes}-Minute Interval Heatmap
            </h2>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                Showing {currentAgents.length} of {agents.length} Agents
              </span>
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10 text-[10px]">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-500" /> Top 3 (Green)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  <TrendingDown className="w-2.5 h-2.5 text-rose-500" /> Bottom 3 (Red)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Carousel Pagination Controls & Rotation Dot Indicators (Identical to Slide 2) */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Frame {activePageIndex + 1} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activePageIndex === idx
                        ? "w-4 bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.6)]"
                        : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500"
                    }`}
                    title={`Go to frame ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => setActivePageIndex((prev) => (prev - 1 + totalPages) % totalPages)}
                  className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Previous frame"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActivePageIndex((prev) => (prev + 1) % totalPages)}
                  className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Next frame"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {onIntervalChange && (
              <HeatmapIntervalSelector
                value={intervalMinutes}
                onChange={onIntervalChange}
              />
            )}

            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setViewMode("echarts")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  viewMode === "echarts"
                    ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Matrix
              </button>
            </div>
          </div>
        </div>

        {viewMode === "echarts" ? (
          <div className="w-full h-[450px]">
            {currentAgents.length > 0 || agents.length > 0 ? (
              <ReactECharts
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No agent lead heatmap data available for this date.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 sticky top-0 z-10 text-[9.5px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2 px-2.5 sticky left-0 bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 z-20 min-w-[170px]">
                    Agent Name
                  </th>
                  <th className="py-2 px-2 text-center text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-900 font-bold min-w-[55px]">
                    Total
                  </th>
                  {intervals.map((inv: AgentHeatmapInterval) => (
                    <th
                      key={inv.slot_index}
                      className="py-1.5 px-1 text-center font-mono whitespace-nowrap min-w-[38px]"
                    >
                      {inv.time_label.split(" - ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                <AnimatePresence mode="wait">
                  {currentAgents.map((a: AgentHeatmapItem) => {
                    const rankInfo = agentRankMap.get(a.agent_id);
                    const isTop3 = rankInfo?.isTop3 ?? false;
                    const isBottom3 = rankInfo?.isBottom3 ?? false;
                    const rank = rankInfo?.rank ?? 0;

                    return (
                      <motion.tr
                        key={`${activePageIndex}-${a.agent_id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={`transition-colors group ${
                          isTop3
                            ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30"
                            : isBottom3
                            ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06] dark:bg-rose-950/20 dark:hover:bg-rose-900/30"
                            : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="py-2 px-2.5 font-semibold text-xs sticky left-0 bg-white dark:bg-slate-950/95 z-10 whitespace-nowrap border-r border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <div
                              className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold shadow-sm transition-all shrink-0 ${
                                isTop3
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 ring-1 ring-emerald-500/40"
                                  : isBottom3
                                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 ring-1 ring-rose-500/40"
                                  : "bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {a.agent_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                              {rank > 0 && (
                                <span
                                  className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[7.5px] font-black shadow-sm ${
                                    isTop3
                                      ? "bg-emerald-500 text-white"
                                      : isBottom3
                                      ? "bg-rose-500 text-white"
                                      : "bg-slate-600 text-white"
                                  }`}
                                  title={`Rank #${rank} on Floor`}
                                >
                                  {rank}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                                {a.agent_name}
                              </span>
                              {isTop3 && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8.5px] rounded-full font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  Top {rank}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-xs text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-950/95 border-r border-slate-200 dark:border-white/10">
                          {a.total_generated}
                        </td>
                        {a.intervals.map((inv: AgentHeatmapInterval) => {
                          const count = inv.generated_count;
                          let bgClass = "text-slate-400/50 dark:text-slate-600/60 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/[0.03] hover:bg-slate-200/50 dark:hover:bg-white/[0.05]";
                          if (count >= 5) {
                            bgClass = "bg-gradient-to-br from-emerald-500 to-green-600 text-white font-black shadow-sm shadow-emerald-500/30 border border-emerald-400/60";
                          } else if (count === 4) {
                            bgClass = "bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-sm shadow-lime-500/25 border border-lime-300/60";
                          } else if (count === 3) {
                            bgClass = "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/25 border border-amber-300/60";
                          } else if (count === 2) {
                            bgClass = "bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold shadow-sm shadow-orange-500/30 border border-orange-400/60";
                          } else if (count === 1) {
                            bgClass = "bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold shadow-sm shadow-red-500/30 border border-red-400/50";
                          }
                          return (
                            <td
                              key={inv.slot_index}
                              className={`py-1 px-0.5 text-center text-[9.5px] rounded transition-all font-mono ${bgClass}`}
                              title={`${inv.time_label}: ${count} leads generated`}
                            >
                              {count > 0 ? count : "·"}
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Heatmap Color Distribution Legend */}
        <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-300">Lead Scoring Velocity:</span>
            <span>Leads created per agent per {intervalMinutes}-min interval</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300 dark:border-white/10">
              <span className="text-[10px] text-slate-400">Scale:</span>
              <div
                className="w-20 h-2 rounded-full border border-white/20 shadow-inner"
                style={{
                  background: "linear-gradient(to right, #ef4444, #f97316, #f59e0b, #84cc16, #10b981)",
                }}
                title="Continuous Intensity Gradient: Low (Red) -> Moderate (Orange) -> High (Amber) -> Peak (Green)"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 inline-block" />
              <span className="text-slate-500 dark:text-slate-400">0 (Quiet)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-red-400 inline-block" style={{ backgroundColor: "#ef4444" }} />
              <span style={{ color: "#ef4444" }} className="font-bold">1 (Low)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-orange-400 inline-block" style={{ backgroundColor: "#f97316" }} />
              <span style={{ color: "#f97316" }} className="font-bold">2 (Moderate)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-amber-400 inline-block" style={{ backgroundColor: "#f59e0b" }} />
              <span style={{ color: "#f59e0b" }} className="font-bold">3 (High)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-lime-400 inline-block" style={{ backgroundColor: "#84cc16" }} />
              <span style={{ color: "#84cc16" }} className="font-bold">4 (Very High)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-emerald-400 inline-block" style={{ backgroundColor: "#10b981" }} />
              <span style={{ color: "#10b981" }} className="font-bold">5+ (Peak Burst)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
