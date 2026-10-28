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

import SlideDateFilter from "@/components/presentation/slide-date-filter";

interface SlideQaHeatmapProps {
  data?: Slide3Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  interval?: number;
  onIntervalChange?: (newInterval: number) => void;
  campaignsData?: CampaignSlide1[];
  selectedDate?: string;
  onDateChange?: (date: string | undefined) => void;
  onApplyDateToAll?: (date: string) => void;
}

export default function SlideQaHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval = 10,
  onIntervalChange,
  campaignsData,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: SlideQaHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("echarts");

  // Sort analysts by total audited descending, strictly filtering out zero-audit unnecessary names
  const analysts: QaHeatmapAnalyst[] = useMemo(() => {
    const raw = data?.qa_heatmap || [];
    const active = raw.filter((a) => (a.total_audited || 0) > 0 || (a.total_qualified || 0) > 0);
    const target = active.length > 0 ? active : raw;
    return [...target].sort((a, b) => (b.total_audited || 0) - (a.total_audited || 0));
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

  // Prepare ECharts heatmap configuration with thermal red-orange-yellow distribution
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
        borderColor: isDark ? "rgba(239, 68, 68, 0.5)" : "rgba(239, 68, 68, 0.7)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 11 },
        formatter: (params: { data: [number, number, number, number, string] }) => {
          const [xIdx, yIdx, val, audited, timeLabel] = params.data;
          const analystName = analystNames[yIdx];
          const primaryColor = isDark ? "#f97316" : "#ea580c";
          const mutedColor = isDark ? "#94a3b8" : "#64748b";
          const successColor = isDark ? "#fbbf24" : "#d97706";
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
        type: "piecewise",
        orient: "horizontal",
        left: "center",
        bottom: 0,
        itemWidth: 16,
        itemHeight: 12,
        itemGap: 14,
        textStyle: { color: isDark ? "#cbd5e1" : "#475569", fontSize: 11, fontWeight: 600 },
        pieces: [
          { min: 5, label: "5+ (Peak Burst)", color: "#ef4444" },        // Coral Red - Peak
          { min: 4, max: 4, label: "4 (Very High)", color: "#f97316" },  // Vibrant Orange - Very High
          { min: 3, max: 3, label: "3 (High)", color: "#f59e0b" },       // Golden Amber - High
          { min: 2, max: 2, label: "2 (Moderate)", color: "#84cc16" },   // Lime Green - Moderate
          { min: 1, max: 1, label: "1 (Low)", color: "#10b981" },        // Emerald Green - Low
          { max: 0, label: "0 (Quiet)", color: isDark ? "rgba(30, 41, 59, 0.45)" : "rgba(241, 245, 249, 0.9)" }, // Muted Neutral
        ],
      },
      series: [
        {
          name: "Qualified Leads",
          type: "heatmap",
          data: seriesData,
          itemStyle: {
            borderColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.7)",
            borderWidth: 1.5,
            borderRadius: 4,
          },
          label: {
            show: true,
            fontSize: 10.5,
            fontWeight: "bold",
            color: (p: { data: [number, number, number] }) => {
              const val = p.data[2];
              if (val === 2 || val === 3) return "#0f172a"; // Dark text on lime & amber
              return "#ffffff";
            },
            formatter: (p: { data: [number, number, number] }) => (p.data[2] > 0 ? String(p.data[2]) : ""),
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(16, 185, 129, 0.6)",
              borderColor: "#ffffff",
              borderWidth: 2,
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
      {/* Top Banner with Slide Title and Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Slide 3 • QA Timewise Heatmap
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

      {/* QA Metrics Top Banner - Professional Formal Colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-blue-200 dark:border-blue-700/30 relative overflow-hidden group bg-blue-50/50 dark:bg-blue-950/20">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-700/10 rounded-full blur-xl group-hover:bg-blue-700/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              QA Analysts On-Duty
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-800 dark:text-blue-300 mt-1.5 tv-stat-number">
              {totalAnalysts} <span className="text-xs text-blue-700 dark:text-blue-400 font-bold">Auditors</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">Active reviewing queue</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-700/15 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-green-200 dark:border-green-700/30 relative overflow-hidden group bg-green-50/50 dark:bg-green-950/20">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-green-700/10 rounded-full blur-xl group-hover:bg-green-700/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
              Verified Qualified
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-green-800 dark:text-green-300 mt-1.5 tv-stat-number">
              {formatNumber(displayQualified)} <span className="text-xs text-green-700 dark:text-green-400 font-bold">Leads</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">Approved compliance today</p>
          </div>
          <div className="p-2 rounded-xl bg-green-700/15 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-gray-300 dark:border-gray-600 relative overflow-hidden group bg-gray-50/50 dark:bg-gray-900/20">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-gray-600/10 rounded-full blur-xl group-hover:bg-gray-600/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
              Total Leads Audited
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-gray-200 mt-1.5 tv-stat-number">
              {formatNumber(displayAudited)} <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Processed</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 flex items-center flex-wrap gap-1.5">
              <span className="text-gray-700 dark:text-gray-300 font-bold">{acceptanceRate}% QA rate</span>
              {displayPendingQa !== undefined && (
                <span className="px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-700 dark:text-orange-400 font-bold text-[10px] border border-orange-300/30 dark:border-orange-600/30">
                  {displayPendingQa} Pending QA
                </span>
              )}
            </p>
          </div>
          <div className="p-2 rounded-xl bg-gray-600/15 text-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-orange-200 dark:border-orange-700/30 relative overflow-hidden group bg-orange-50/50 dark:bg-orange-950/20">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-600/10 rounded-full blur-xl group-hover:bg-orange-600/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
              Shift Granularity
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-orange-800 dark:text-orange-300 mt-1.5 tv-stat-number">
              {intervalMinutes} <span className="text-xs text-orange-700 dark:text-orange-400 font-bold">min</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">{totalIntervals} intervals ({shiftHours})</p>
          </div>
          <div className="p-2 rounded-xl bg-orange-600/15 text-orange-800 dark:text-orange-400 border border-orange-300 dark:border-orange-600">
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
                      let cellClass = "";
                      
                      if (count >= 5) {
                        cellClass = "bg-gradient-to-br from-rose-500 to-red-600 text-white font-black shadow-sm shadow-red-500/30 border border-red-400/60";
                      } else if (count === 4) {
                        cellClass = "bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold shadow-sm shadow-orange-500/30 border border-orange-400/60";
                      } else if (count === 3) {
                        cellClass = "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/25 border border-amber-300/60";
                      } else if (count === 2) {
                        cellClass = "bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-sm shadow-lime-500/25 border border-lime-300/60";
                      } else if (count === 1) {
                        cellClass = "bg-gradient-to-br from-emerald-500 to-green-600 text-white font-bold shadow-sm shadow-emerald-500/25 border border-emerald-400/50";
                      } else {
                        // 0 (Quiet): Subtle, clean neutral background without glaring neon green
                        cellClass = "text-slate-400/50 dark:text-slate-600/60 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/[0.03] hover:bg-slate-200/50 dark:hover:bg-white/[0.05]";
                      }
                      
                      return (
                        <td
                          key={inv.slot_index}
                          className={`py-1 px-0.5 text-center text-[9.5px] rounded transition-all font-mono ${cellClass}`}
                          title={`${inv.time_label}: ${count} qualified / ${inv.audited_count} audited`}
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

        {/* Heatmap Color Distribution Legend - Professional Gradient Palette */}
        <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-300">Auditing Velocity:</span>
            <span>Qualified leads approved per {intervalMinutes}-min interval</span>
            {/* Visual gradient preview bar inspired by standard data visualization heatmaps */}
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
