"use client";

import React, { useMemo, useState } from "react";
import { Slide3Data, QaHeatmapAnalyst, QaHeatmapInterval, CampaignSlide1 } from "@/types";
import { formatNumber } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  BarChart3,
  Flame,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";
import { useTheme } from "@/components/providers/theme-provider";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface SlideQaHeatmapProps {
  data?: Slide3Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  interval?: number;
  onIntervalChange?: (newInterval: number) => void;
  campaignsData?: CampaignSlide1[];
}

export default function SlideQaHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval = 10,
  onIntervalChange,
  campaignsData,
}: SlideQaHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("echarts");

  // Sort analysts by total audited descending
  const analysts: QaHeatmapAnalyst[] = useMemo(() => {
    const raw = data?.qa_heatmap || [];
    return [...raw].sort((a, b) => (b.total_audited || 0) - (a.total_audited || 0));
  }, [data?.qa_heatmap]);

  const intervals: QaHeatmapInterval[] = analysts[0]?.intervals || [];
  const totalAnalysts = data?.total_qa_analysts || analysts.length;
  const totalQualified = analysts.reduce((acc: number, a: QaHeatmapAnalyst) => acc + (a.total_qualified || 0), 0);
  const totalAudited = analysts.reduce((acc: number, a: QaHeatmapAnalyst) => acc + (a.total_audited || 0), 0);

  // Live campaign QA metrics (matching CRM Admin Dashboard Today count: Qualified + Disqualified = Audited, and Pending QA)
  const campaignTotals = useMemo(() => {
    if (!campaignsData || campaignsData.length === 0) return null;
    let qual = 0;
    let disq = 0;
    let pending = 0;
    for (const c of campaignsData) {
      qual += Number(c.qualified_leads || 0);
      disq += Number(c.disqualified_leads || 0);
      pending += Number(c.pending_qa || 0);
    }
    return {
      audited: qual + disq,
      qualified: qual,
      disqualified: disq,
      pending_qa: pending,
    };
  }, [campaignsData]);

  const displayQualified = campaignTotals?.qualified ?? data?.today_qualified ?? totalQualified;
  const displayAudited = campaignTotals?.audited ?? data?.today_audited ?? totalAudited;
  const displayPendingQa = campaignTotals?.pending_qa ?? data?.today_pending_qa;
  const acceptanceRate = displayAudited > 0 ? Math.round((displayQualified / displayAudited) * 100) : 0;

  const intervalMinutes = data?.interval_minutes || interval;
  const totalIntervals = data?.total_intervals || intervals.length;
  const shiftHours = data?.shift_start && data?.shift_end ? `${data.shift_start} - ${data.shift_end}` : "17:30 - 02:30";

  // Prepare ECharts heatmap configuration
  const chartOption = useMemo(() => {
    const timeLabels = intervals.map((i: QaHeatmapInterval) => i.time_label.split(" - ")[0]);
    const analystNames = analysts.map((a: QaHeatmapAnalyst) => a.full_name);

    const labelInterval =
      intervals.length <= 12 ? 0 : intervals.length <= 24 ? 1 : intervals.length <= 40 ? 2 : intervals.length <= 60 ? 3 : 5;

    const seriesData: [number, number, number, number, string][] = [];
    let maxVal = 1;

    analysts.forEach((analyst: QaHeatmapAnalyst, yIdx: number) => {
      analyst.intervals.forEach((inv: QaHeatmapInterval, xIdx: number) => {
        const val = inv.qualified_count || 0;
        if (val > maxVal) maxVal = val;
        seriesData.push([xIdx, yIdx, val, inv.audited_count || 0, inv.time_label]);
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "rgba(6, 182, 212, 0.4)" : "rgba(6, 182, 212, 0.6)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 11 },
        formatter: (params: { data: [number, number, number, number, string] }) => {
          const [xIdx, yIdx, val, audited, timeLabel] = params.data;
          const analystName = analystNames[yIdx];
          const primaryColor = isDark ? "#38bdf8" : "#0284c7";
          const mutedColor = isDark ? "#94a3b8" : "#64748b";
          const successColor = isDark ? "#34d399" : "#059669";
          return `
            <div style="font-weight: 700; color: ${primaryColor}; margin-bottom: 3px;">${analystName}</div>
            <div style="color: ${mutedColor}; font-size: 10px; margin-bottom: 4px;">Slot: ${timeLabel}</div>
            <div style="display: flex; gap: 10px; font-size: 11px;">
              <span>Qualified: <b style="color: ${successColor};">${val} leads</b></span>
              <span>Audited: <b style="color: ${mutedColor};">${audited}</b></span>
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
        data: analystNames,
        axisLabel: {
          color: isDark ? "#e2e8f0" : "#1e293b",
          fontSize: 12,
          fontWeight: 700,
        },
        axisLine: { lineStyle: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" } },
        splitLine: { show: true, lineStyle: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)" } },
      },
      visualMap: {
        min: 0,
        max: Math.max(4, maxVal),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 12,
        itemHeight: 100,
        textStyle: { color: isDark ? "#94a3b8" : "#475569", fontSize: 10 },
        inRange: {
          color: isDark
            ? ["#0b1329", "#0284c7", "#06b6d4", "#10b981", "#fbbf24"]
            : ["#f1f5f9", "#38bdf8", "#06b6d4", "#10b981", "#f59e0b"],
        },
      },
      series: [
        {
          name: "Qualified Leads",
          type: "heatmap",
          data: seriesData,
          label: {
            show: true,
            fontSize: 10,
            fontWeight: "bold",
            color: isDark ? "#ffffff" : "#0f172a",
            formatter: (p: { data: [number, number, number] }) => (p.data[2] > 0 ? String(p.data[2]) : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: "rgba(6, 182, 212, 0.7)",
              borderColor: "#ffffff",
              borderWidth: 1,
            },
          },
        },
      ],
    };
  }, [analysts, intervals, isDark]);

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM QA Heatmap API Error</h3>
        <p className="text-xs text-rose-300 max-w-lg mb-3">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
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
          <p className="text-xs text-slate-400">Fetching live Quality Team Heatmap from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3.5 p-1 animate-fadeIn">
      {/* QA Metrics Top Banner - Reduced compact sizing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              QA Analysts On-Duty
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-cyan-300 mt-1.5 tv-stat-number tv-stat-number-cyan">
              {totalAnalysts} <span className="text-xs text-cyan-500 dark:text-cyan-400 font-bold">Auditors</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active reviewing queue</p>
          </div>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Verified Qualified
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 tv-stat-number tv-stat-number-emerald">
              {formatNumber(displayQualified)} <span className="text-xs text-emerald-500 dark:text-emerald-300 font-bold">Leads</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Approved compliance today</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Leads Audited
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5 tv-stat-number">
              {formatNumber(displayAudited)} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Processed</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center flex-wrap gap-1.5">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{acceptanceRate}% QA rate</span>
              {displayPendingQa !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                  {displayPendingQa} Pending QA
                </span>
              )}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Shift Granularity
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5 tv-stat-number tv-stat-number-amber">
              {intervalMinutes} <span className="text-xs text-amber-500 dark:text-amber-300 font-bold">min</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{totalIntervals} intervals ({shiftHours})</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Heatmap Card */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 shadow-lg flex flex-col">
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-white/10 mb-2 gap-2">
          <div>
            <h2 className="text-xs lg:text-sm font-bold text-white flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              Quality Team {intervalMinutes}-Minute Interval Timewise Heatmap
            </h2>
            <p className="text-[11px] text-slate-400">
              Real-time audit velocity: qualified leads approved per QA analyst across {intervalMinutes}-minute intervals
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
                    ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                  viewMode === "matrix"
                    ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm"
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
            {analysts.length > 0 ? (
              <ReactECharts
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No QA heatmap data available for this date.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[440px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 sticky top-0 z-10 text-[9.5px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2 px-2.5 sticky left-0 bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 z-20 min-w-[130px]">
                    QA Analyst
                  </th>
                  <th className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 bg-slate-100 dark:bg-slate-900 font-bold">Total</th>
                  {intervals.map((inv: QaHeatmapInterval) => (
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
                {analysts.map((a: QaHeatmapAnalyst) => (
                  <tr key={a.user_id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                    <td className="py-1.5 px-2.5 font-semibold text-xs text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-950/90 z-10 whitespace-nowrap border-r border-slate-200 dark:border-transparent">
                      {a.full_name}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950/90">
                      {a.total_qualified}
                    </td>
                    {a.intervals.map((inv: QaHeatmapInterval) => {
                      const count = inv.qualified_count;
                      const bgClass =
                        count >= 3
                          ? "bg-amber-400/80 text-black font-black"
                          : count === 2
                          ? "bg-emerald-500/70 text-black font-bold"
                          : count === 1
                          ? "bg-cyan-600/50 text-white font-semibold"
                          : "text-slate-400 dark:text-slate-600";
                      return (
                        <td
                          key={inv.slot_index}
                          className={`py-1 px-0.5 text-center text-[9.5px] rounded ${bgClass}`}
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
