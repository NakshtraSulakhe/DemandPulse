"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Slide4Data } from "@/types";
import { formatNumber } from "@/lib/utils";
import { Zap, Users, Clock, Flame, TrendingUp, Layers, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  ),
});

interface SlideAgentHeatmapProps {
  data?: Slide4Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  interval?: number;
  onIntervalChange?: (interval: number) => void;
}

export default function SlideAgentHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval,
  onIntervalChange,
}: SlideAgentHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("echarts");

  const agents = data?.agent_heatmap || [];
  const totalAgents = data?.total_agents || agents.length;
  const totalGenerated = agents.reduce((acc, a) => acc + (a.total_generated || 0), 0);

  const intervalMinutes = data?.interval_minutes || interval || 10;
  const totalIntervals = data?.total_intervals || agents[0]?.intervals?.length || 54;

  const chartOption = useMemo(() => {
    if (!agents.length) return {};

    const agentNames = agents.map((a) => a.agent_name);
    const intervals = agents[0]?.intervals || [];
    const timeLabels = intervals.map((i) => i.time_label.split(" - ")[0]);

    const labelInterval =
      intervals.length <= 12 ? 0 : intervals.length <= 24 ? 1 : intervals.length <= 40 ? 2 : intervals.length <= 60 ? 3 : 5;

    const seriesData: [number, number, number, string][] = [];
    let maxVal = 1;

    agents.forEach((agent, yIdx) => {
      agent.intervals.forEach((interval, xIdx) => {
        const val = interval.generated_count || 0;
        if (val > maxVal) maxVal = val;
        seriesData.push([xIdx, yIdx, val, interval.time_label]);
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "rgba(139, 92, 246, 0.4)" : "rgba(139, 92, 246, 0.6)",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 12 },
        formatter: (params: { data: [number, number, number, string] }) => {
          const [xIdx, yIdx, val, timeLabel] = params.data;
          const agentName = agentNames[yIdx];
          const purpleColor = isDark ? "#a78bfa" : "#7c3aed";
          const mutedColor = isDark ? "#94a3b8" : "#64748b";
          const goldColor = isDark ? "#fcd34d" : "#d97706";
          return `
            <div style="font-weight: 700; color: ${purpleColor}; margin-bottom: 4px;">${agentName}</div>
            <div style="color: ${mutedColor}; font-size: 11px; margin-bottom: 6px;">Interval: ${timeLabel}</div>
            <div style="font-size: 12px; color: ${mutedColor};">
              Generated: <b style="color: ${goldColor};">${val} leads</b>
            </div>
          `;
        },
      },
      grid: {
        top: 20,
        bottom: 65,
        left: 170,
        right: 40,
      },
      xAxis: {
        type: "category",
        data: timeLabels,
        splitArea: { show: true, areaStyle: { color: isDark ? ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.03)"] : ["rgba(0,0,0,0.015)", "rgba(0,0,0,0.03)"] } },
        axisLabel: {
          color: isDark ? "#94a3b8" : "#475569",
          fontSize: 12,
          fontWeight: 600,
          interval: labelInterval,
          rotate: 35,
        },
        axisLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)" } },
      },
      yAxis: {
        type: "category",
        data: agentNames,
        axisLabel: {
          color: isDark ? "#e2e8f0" : "#1e293b",
          fontSize: 13,
          fontWeight: 700,
        },
        axisLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)" } },
        splitLine: { show: true, lineStyle: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" } },
      },
      visualMap: {
        min: 0,
        max: Math.max(3, maxVal),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: {
          color: isDark
            ? ["#0b1329", "#4338ca", "#06b6d4", "#10b981", "#f59e0b"]
            : ["#f1f5f9", "#818cf8", "#06b6d4", "#10b981", "#f59e0b"],
        },
        textStyle: { color: isDark ? "#94a3b8" : "#475569", fontSize: 12 },
      },
      series: [
        {
          name: "Generated Leads",
          type: "heatmap",
          data: seriesData,
          label: {
            show: true,
            fontSize: 11,
            fontWeight: "bold",
            color: isDark ? "#ffffff" : "#0f172a",
            formatter: (p: { data: [number, number, number] }) => (p.data[2] > 0 ? String(p.data[2]) : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(139, 92, 246, 0.8)",
              borderColor: "#ffffff",
              borderWidth: 1.5,
            },
          },
        },
      ],
    };
  }, [agents]);

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-8 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[480px]">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-white mb-1">CRM Agent Heatmap API Error</h3>
        <p className="text-xs text-rose-300 max-w-lg mb-4">{error.message}</p>
        <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-slate-400 mb-5 max-w-md text-left">
          <span className="text-slate-300 font-semibold block mb-1">Upstream CRM Endpoint:</span>
          <code className="text-cyan-300 font-mono block">GET /api/v1/slides/slide4.php</code>
          <code className="text-cyan-300 font-mono block">GET /api/v1/slides_analytics.php?action=slide4</code>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/20"
          >
            <Zap className="w-3.5 h-3.5" />
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
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Fetching live Agent Heatmap from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-5 p-2 animate-fadeIn">
      {/* Top Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 lg:p-6 rounded-2xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div>
            <span className="text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lead Gen Agents
            </span>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-purple-600 dark:text-purple-300 mt-2 tv-stat-number tv-stat-number-purple">
              {totalAgents} <span className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 font-bold">Rostered</span>
            </div>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">Active outbound SDRs</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 lg:p-6 rounded-2xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          <div>
            <span className="text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Generated Leads
            </span>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-cyan-600 dark:text-cyan-400 mt-2 tv-stat-number tv-stat-number-cyan">
              {formatNumber(totalGenerated)} <span className="text-xs lg:text-sm text-cyan-500 dark:text-cyan-300 font-bold">Leads</span>
            </div>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">Floor production today</p>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 lg:p-6 rounded-2xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
          <div>
            <span className="text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Average Leads / SDR
            </span>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-amber-600 dark:text-amber-400 mt-2 tv-stat-number tv-stat-number-amber">
              {totalAgents > 0 ? (totalGenerated / totalAgents).toFixed(1) : 0}
            </div>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">Individual throughput</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 lg:p-6 rounded-2xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div>
            <span className="text-xs lg:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shift Intervals
            </span>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tv-stat-number tv-stat-number-emerald">
              {totalIntervals} <span className="text-xs lg:text-sm text-emerald-500 dark:text-emerald-300 font-bold">Slots</span>
            </div>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">{intervalMinutes}-minute time buckets</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Heatmap Container */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl flex flex-col">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 mb-2 gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-400" />
              Agent Lead Generation {intervalMinutes}-Minute Interval Heatmap
            </h2>
            <p className="text-xs text-slate-400">
              Timewise outbound pace: leads generated per agent across each {intervalMinutes}-minute segment of the shift
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onIntervalChange && (
              <HeatmapIntervalSelector
                value={intervalMinutes}
                onChange={onIntervalChange}
              />
            )}

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setViewMode("echarts")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  viewMode === "echarts"
                    ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Heatmap Graphic
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-purple-600 text-white font-bold border-purple-500 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Interval Matrix
              </button>
            </div>
          </div>
        </div>

        {viewMode === "echarts" ? (
          <div className="w-full h-[520px]">
            {agents.length > 0 ? (
              <ReactECharts
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No agent lead heatmap data available for this date.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 sticky top-0 z-10 text-[10px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 z-20 min-w-[150px]">
                    Agent Name
                  </th>
                  <th className="py-2.5 px-2 text-center text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-900 font-bold">Total</th>
                  {agents[0]?.intervals.map((inv) => (
                    <th
                      key={inv.slot_index}
                      className="py-2 px-1 text-center font-mono whitespace-nowrap min-w-[45px]"
                    >
                      {inv.time_label.split(" - ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                {agents.map((a) => (
                  <tr key={a.agent_id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-950/90 z-10 whitespace-nowrap border-r border-slate-200 dark:border-transparent">
                      {a.agent_name}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-950/90">
                      {a.total_generated}
                    </td>
                    {a.intervals.map((inv) => {
                      const count = inv.generated_count;
                      const bgClass =
                        count >= 3
                          ? "bg-amber-400/80 text-black font-black"
                          : count === 2
                          ? "bg-emerald-500/70 text-black font-bold"
                          : count === 1
                          ? "bg-purple-600/50 text-white font-semibold"
                          : "text-slate-400 dark:text-slate-600";
                      return (
                        <td
                          key={inv.slot_index}
                          className={`py-1.5 px-1 text-center text-[10px] rounded ${bgClass}`}
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
      </div>
    </div>
  );
}
