"use client";

import React, { useMemo, useState } from "react";
import { Slide4Data, AgentHeatmapItem, AgentHeatmapInterval } from "@/types";
import { formatNumber } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  Users,
  Zap,
  Clock,
  TrendingUp,
  Flame,
  AlertCircle,
} from "lucide-react";
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
  selectedDate?: string;
  onDateChange?: (date: string | undefined) => void;
  onApplyDateToAll?: (date: string) => void;
}

export default function SlideAgentHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval = 10,
  onIntervalChange,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: SlideAgentHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("echarts");

  const agents: AgentHeatmapItem[] = useMemo(() => {
    const raw = data?.agent_heatmap || [];
    return [...raw].sort((a, b) => (b.total_generated || 0) - (a.total_generated || 0));
  }, [data?.agent_heatmap]);

  const intervals: AgentHeatmapInterval[] = agents[0]?.intervals || [];
  const totalAgents = data?.total_agents || agents.length;
  const totalGenerated = agents.reduce((acc: number, a: AgentHeatmapItem) => acc + (a.total_generated || 0), 0);
  const intervalMinutes = data?.interval_minutes || interval;
  const totalIntervals = data?.total_intervals || intervals.length;

  // Prepare ECharts heatmap configuration
  const chartOption = useMemo(() => {
    const timeLabels = intervals.map((i: AgentHeatmapInterval) => i.time_label.split(" - ")[0]);
    const agentNames = agents.map((a: AgentHeatmapItem) => a.agent_name);

    const labelInterval =
      intervals.length <= 12 ? 0 : intervals.length <= 24 ? 1 : intervals.length <= 40 ? 2 : intervals.length <= 60 ? 3 : 5;

    const seriesData: [number, number, number, string][] = [];
    let maxVal = 1;

    agents.forEach((agent: AgentHeatmapItem, yIdx: number) => {
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
          { min: 5, label: "5+ (Peak Burst)", color: "#ef4444" },
          { min: 4, max: 4, label: "4 (Very High)", color: "#f97316" },
          { min: 3, max: 3, label: "3 (High)", color: "#f59e0b" },
          { min: 2, max: 2, label: "2 (Moderate)", color: "#84cc16" },
          { min: 1, max: 1, label: "1 (Low)", color: "#10b981" },
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
            color: (p: { data: [number, number, number] }) => (p.data[2] === 1 ? "#0f172a" : "#ffffff"),
            formatter: (p: { data: [number, number, number] }) => (p.data[2] > 0 ? String(p.data[2]) : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(239, 68, 68, 0.8)",
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [agents, intervals, isDark]);

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

      {/* Top Banner - Reduced compact sizing */}
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
      <div className="glass-panel rounded-xl p-4 border border-white/10 shadow-lg flex flex-col">
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-white/10 mb-2 gap-2">
          <div>
            <h2 className="text-xs lg:text-sm font-bold text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              Agent Lead Generation {intervalMinutes}-Minute Interval Heatmap
            </h2>
            <p className="text-[11px] text-slate-400">
              Timewise outbound pace: leads generated per agent across each {intervalMinutes}-minute segment of the shift
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
            {agents.length > 0 ? (
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
          <div className="overflow-x-auto max-h-[440px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 sticky top-0 z-10 text-[9.5px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2 px-2.5 sticky left-0 bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 z-20 min-w-[130px]">
                    Agent Name
                  </th>
                  <th className="py-2 px-2 text-center text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-900 font-bold">Total</th>
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
                {agents.map((a: AgentHeatmapItem) => (
                  <tr key={a.agent_id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                    <td className="py-1.5 px-2.5 font-semibold text-xs text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-950/90 z-10 whitespace-nowrap border-r border-slate-200 dark:border-transparent">
                      {a.agent_name}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-xs text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-950/90">
                      {a.total_generated}
                    </td>
                    {a.intervals.map((inv: AgentHeatmapInterval) => {
                      const count = inv.generated_count;
                      let bgClass = "text-slate-400/50 dark:text-slate-600/60 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/[0.03] hover:bg-slate-200/50 dark:hover:bg-white/[0.05]";
                      if (count >= 5) {
                        bgClass = "bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-sm shadow-red-500/30 border border-red-400/60";
                      } else if (count === 4) {
                        bgClass = "bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold shadow-sm shadow-orange-500/30 border border-orange-400/60";
                      } else if (count === 3) {
                        bgClass = "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/25 border border-amber-300/60";
                      } else if (count === 2) {
                        bgClass = "bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-sm shadow-lime-500/25 border border-lime-300/60";
                      } else if (count === 1) {
                        bgClass = "bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow-sm shadow-emerald-500/25 border border-emerald-400/50";
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
                  </tr>
                ))}
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
                  background: "linear-gradient(to right, #10b981, #84cc16, #f59e0b, #f97316, #ef4444)",
                }}
                title="Continuous Intensity Gradient: Low (Green) -> Moderate (Lime/Amber) -> High (Orange/Red)"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 inline-block" />
              <span className="text-slate-500 dark:text-slate-400">0 (Quiet)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-emerald-400 inline-block" style={{ backgroundColor: "#10b981" }} />
              <span style={{ color: "#10b981" }} className="font-bold">1 (Low)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-lime-400 inline-block" style={{ backgroundColor: "#84cc16" }} />
              <span style={{ color: "#84cc16" }} className="font-bold">2 (Moderate)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-amber-400 inline-block" style={{ backgroundColor: "#f59e0b" }} />
              <span style={{ color: "#f59e0b" }} className="font-bold">3 (High)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-orange-400 inline-block" style={{ backgroundColor: "#f97316" }} />
              <span style={{ color: "#f97316" }} className="font-bold">4 (Very High)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded border border-red-400 inline-block" style={{ backgroundColor: "#ef4444" }} />
              <span style={{ color: "#ef4444" }} className="font-bold">5+ (Peak Burst)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
