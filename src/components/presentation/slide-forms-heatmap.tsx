"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Slide6Data, FormSubmitterHeatmapItem, FormSubmitterInterval, FormSubmissionLead } from "@/types";
import { formatNumber } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  FileText,
  Users,
  Zap,
  Clock,
  Flame,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import HeatmapIntervalSelector from "@/components/presentation/heatmap-interval-selector";
import { useTheme } from "@/components/providers/theme-provider";
import SlideDateFilter from "@/components/presentation/slide-date-filter";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface SlideFormsHeatmapProps {
  data?: Slide6Data;
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

export default function SlideFormsHeatmap({
  data,
  isLoading,
  error,
  onRetry,
  interval = 10,
  onIntervalChange,
  rowsPerPage = 8,
  selectedDate,
  onDateChange,
  onApplyDateToAll,
}: SlideFormsHeatmapProps) {
  const { isDark } = useTheme();
  const [viewMode, setViewMode] = useState<"echarts" | "matrix">("matrix");
  const [activePageIndex, setActivePageIndex] = useState<number>(0);



  // Sort submitters by total forms submitted descending, strictly for Department: Email Marketing
  const submitters: FormSubmitterHeatmapItem[] = useMemo(() => {
    const raw = data?.submitter_heatmap || [];
    const filtered = raw.filter((sub) => {
      const dept = (sub.department || "").toLowerCase();
      const role = (sub.role || "").toLowerCase();
      // If department is explicitly specified, exclude non-email marketing
      if (dept && !dept.includes("email") && !dept.includes("marketing")) {
        return false;
      }
      if (role && (role.includes("qa") || role.includes("sdr") || role.includes("telemarketer"))) {
        if (!role.includes("email")) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const diff = (b.total_submitted || 0) - (a.total_submitted || 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }, [data?.submitter_heatmap]);

  // Precompute rank map for top 3 performers
  const submitterRankMap = useMemo(() => {
    const map = new Map<number, { rank: number; isTop3: boolean }>();
    submitters.forEach((sub, index) => {
      const rank = index + 1;
      const isTop3 = index < 3;
      map.set(sub.user_id, { rank, isTop3 });
    });
    return map;
  }, [submitters]);

  // Group submitters into rotating frames (sub-slides, 8 per frame by default)
  const chunks: Array<FormSubmitterHeatmapItem[]> = useMemo(() => {
    const res: Array<FormSubmitterHeatmapItem[]> = [];
    for (let i = 0; i < submitters.length; i += rowsPerPage) {
      res.push(submitters.slice(i, i + rowsPerPage));
    }
    return res;
  }, [submitters, rowsPerPage]);

  const totalPages = Math.max(1, chunks.length);

  // Auto carousel frame rotation (12s per frame)
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(timer);
  }, [totalPages]);

  useEffect(() => {
    if (activePageIndex >= totalPages) {
      setActivePageIndex(0);
    }
  }, [totalPages, activePageIndex]);

  const currentSubmitters = chunks[activePageIndex] || [];
  const intervals: FormSubmitterInterval[] = submitters[0]?.intervals || [];
  const totalSubmitters = data?.total_submitters || submitters.length;
  const totalFormsSubmitted = data?.total_forms_submitted || submitters.reduce((acc, s) => acc + (s.total_submitted || 0), 0);
  const intervalMinutes = data?.interval_minutes || interval;
  const totalIntervals = data?.total_intervals || intervals.length;

  // Floor sum per interval
  const floorIntervalTotals = useMemo(() => {
    if (intervals.length === 0) return [];
    return intervals.map((inv, idx) => {
      const count = submitters.reduce((acc, sub) => acc + (sub.intervals[idx]?.submitted_count || 0), 0);
      return {
        slot_index: idx,
        time_label: inv.time_label,
        count,
      };
    });
  }, [intervals, submitters]);

  // Peak slot calculation
  const peakSlot = useMemo(() => {
    if (floorIntervalTotals.length === 0) return null;
    let max = floorIntervalTotals[0];
    for (const s of floorIntervalTotals) {
      if (s.count > max.count) max = s;
    }
    return max;
  }, [floorIntervalTotals]);

  // Top submitter
  const topSubmitter = submitters[0];

  // Prepare ECharts heatmap configuration
  const chartOption = useMemo(() => {
    const targetSubmitters = currentSubmitters.length > 0 ? currentSubmitters : submitters;
    const timeLabels = intervals.map((i: FormSubmitterInterval) => i.time_label.split(" - ")[0]);
    const submitterNames = targetSubmitters.map((s: FormSubmitterHeatmapItem) => s.name);

    const labelInterval =
      intervals.length <= 12 ? 0 : intervals.length <= 24 ? 1 : intervals.length <= 40 ? 2 : intervals.length <= 60 ? 3 : 5;

    const seriesData: [number, number, number, string][] = [];
    let maxVal = 1;

    targetSubmitters.forEach((sub: FormSubmitterHeatmapItem, yIdx: number) => {
      sub.intervals.forEach((inv: FormSubmitterInterval, xIdx: number) => {
        const val = inv.submitted_count || 0;
        if (val > maxVal) maxVal = val;
        seriesData.push([xIdx, yIdx, val, inv.time_label]);
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)",
        borderColor: isDark ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.6)",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#ffffff" : "#0f172a", fontSize: 11 },
        formatter: (params: { data: [number, number, number, string] }) => {
          const [xIdx, yIdx, val, timeLabel] = params.data;
          const subName = submitterNames[yIdx];
          const primaryColor = isDark ? "#fbbf24" : "#d97706";
          const mutedColor = isDark ? "#94a3b8" : "#64748b";
          const highlightColor = isDark ? "#38bdf8" : "#0284c7";
          return `
            <div style="font-weight: 700; color: ${primaryColor}; margin-bottom: 3px;">${subName}</div>
            <div style="color: ${mutedColor}; font-size: 10px; margin-bottom: 4px;">Slot: ${timeLabel}</div>
            <div style="font-size: 11px;">
              <span>Forms Submitted: <b style="color: ${highlightColor};">${val}</b></span>
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
        splitArea: {
          show: true,
          areaStyle: {
            color: isDark
              ? ["rgba(255,255,255,0.01)", "rgba(255,255,255,0.02)"]
              : ["rgba(0,0,0,0.01)", "rgba(0,0,0,0.02)"],
          },
        },
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
        data: submitterNames,
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
          { min: 5, label: "5+ (Peak Output)", color: "#10b981" },
          { min: 4, max: 4, label: "4 (Very High)", color: "#84cc16" },
          { min: 3, max: 3, label: "3 (High)", color: "#f59e0b" },
          { min: 2, max: 2, label: "2 (Moderate)", color: "#f97316" },
          { min: 1, max: 1, label: "1 (Low)", color: "#ef4444" },
          { max: 0, label: "0 (No forms)", color: isDark ? "rgba(30, 41, 59, 0.45)" : "rgba(241, 245, 249, 0.85)" },
        ],
      },
      series: [
        {
          name: "Forms Submitted",
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
              return val >= 1 ? "#ffffff" : isDark ? "#475569" : "#94a3b8";
            },
            formatter: (p: { data: [number, number, number] }) => {
              return p.data[2] > 0 ? String(p.data[2]) : "";
            },
          },
        },
      ],
    };
  }, [currentSubmitters, submitters, intervals, isDark]);

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
          <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-sm font-bold tracking-wide uppercase text-amber-500 animate-pulse">
          Loading Form Submissions Heatmap...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-red-500/20 backdrop-blur-sm">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-full mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
          Unable to Load Form Submissions
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md text-center mb-6">
          {error.message || "Encountered an issue communicating with the CRM forms endpoint."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 font-sans">
      {/* 4 Hero KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Total Forms Submitted */}
        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
              Total Forms Submitted
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatNumber(totalFormsSubmitted)}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                ({totalSubmitters} submitters)
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Submitters */}
        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
              Active Submitters
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                {totalSubmitters}
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                email marketing agents
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Peak Submission Slot */}
        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
              Peak Slot Velocity
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-orange-600 dark:text-orange-400 truncate max-w-[140px]">
                {peakSlot ? peakSlot.time_label.split(" - ")[0] : "—"}
              </span>
              {peakSlot && peakSlot.count > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  {peakSlot.count} forms
                </span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-500">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Top Form Submitter */}
        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
              Top Submitter
            </span>
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[130px]">
                {topSubmitter ? topSubmitter.name : "—"}
              </span>
              {topSubmitter && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  {topSubmitter.total_submitted} forms
                </span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-yellow-500">
            <Trophy className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Submissions Ticker Ribbon */}
      {data?.recent_submissions && data.recent_submissions.length > 0 && (
        <div className="w-full px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 overflow-hidden text-[11px]">
          <div className="flex items-center gap-1.5 shrink-0 text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-[10px]">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>Recent Form Activity:</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap text-slate-700 dark:text-slate-300">
            {data.recent_submissions.slice(0, 5).map((rec: FormSubmissionLead, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{rec.lead_id}</span>
                {rec.submitter_name && (
                  <span className="font-semibold text-slate-900 dark:text-white">• {rec.submitter_name}</span>
                )}
                {rec.campaign_name && (
                  <span className="text-slate-500 text-[10px]">({rec.campaign_name})</span>
                )}
                {rec.submitted_at && (
                  <span className="text-slate-400 font-mono text-[9.5px]">
                    {rec.submitted_at.includes(" ") ? rec.submitted_at.split(" ")[1] : rec.submitted_at}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Heatmap Container */}
      <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md flex flex-col">
        {/* Heatmap Subtitle & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-white/10 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span>Slide 5 • Form Submission Shift Productivity</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {intervalMinutes} Min Granularity
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Distribution of completed form submissions across shift hours • Department: Email Marketing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date filter picker */}
            {onDateChange && (
              <SlideDateFilter
                selectedDate={selectedDate}
                onDateChange={onDateChange}
                onApplyToAll={onApplyDateToAll}
                showApplyToAll={!!onApplyDateToAll}
                compact={true}
              />
            )}

            {/* Frame Carousel Navigator (for > 8 submitters) */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-300/80 dark:border-white/10 shadow-inner">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mr-1">
                Frame {activePageIndex + 1}/{totalPages}
              </span>

              <div className="flex items-center gap-1">
                {chunks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePageIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${activePageIndex === idx
                      ? "bg-amber-500 w-3.5"
                      : "bg-slate-400 dark:bg-slate-700 hover:bg-amber-400"
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

            {/* Granularity selector */}
            {onIntervalChange && (
              <HeatmapIntervalSelector
                value={intervalMinutes}
                onChange={onIntervalChange}
              />
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-950/80 border border-slate-300/80 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setViewMode("echarts")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${viewMode === "echarts"
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${viewMode === "matrix"
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                Matrix
              </button>
            </div>
          </div>
        </div>

        {/* View Mode: ECharts Heatmap */}
        {viewMode === "echarts" ? (
          <div className="w-full h-[450px]">
            {currentSubmitters.length > 0 || submitters.length > 0 ? (
              <ReactECharts
                option={chartOption}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No form submission heatmap data available for this date.
              </div>
            )}
          </div>
        ) : (
          /* View Mode: Matrix Grid */
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 sticky top-0 z-10 text-[9.5px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2 px-2.5 sticky left-0 bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300 z-20 min-w-[170px]">
                    Agent Name (Email Marketing)
                  </th>
                  <th className="py-2 px-2 text-center text-amber-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-900 font-bold min-w-[55px]">
                    Total
                  </th>
                  {intervals.map((inv: FormSubmitterInterval) => (
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
                  {currentSubmitters.map((sub: FormSubmitterHeatmapItem) => {
                    const rankInfo = submitterRankMap.get(sub.user_id);
                    const isTop3 = rankInfo?.isTop3 ?? false;
                    const rank = rankInfo?.rank ?? 0;

                    return (
                      <motion.tr
                        key={`${activePageIndex}-${sub.user_id}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                        className={`transition-colors group ${isTop3
                          ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08] dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
                          : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                          }`}
                      >
                        <td className="py-2 px-2.5 font-semibold text-xs sticky left-0 bg-white dark:bg-slate-950/95 z-10 whitespace-nowrap border-r border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <div
                              className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[9.5px] font-bold shadow-sm transition-all shrink-0 ${isTop3
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/50 ring-1 ring-amber-500/40"
                                : "bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                }`}
                            >
                              {sub.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                              {rank > 0 && (
                                <span
                                  className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[7.5px] font-black shadow-sm ${isTop3 ? "bg-amber-500 text-slate-950" : "bg-slate-600 text-white"
                                    }`}
                                  title={`Rank #${rank} in Form Submissions`}
                                >
                                  {rank}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                                {sub.name}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans">
                                Email Marketing
                              </span>
                              {isTop3 && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8.5px] rounded-full font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  Top {rank}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Total forms submitted */}
                        <td className="py-2 px-2 text-center font-bold text-xs text-amber-600 dark:text-amber-400 bg-slate-50 dark:bg-slate-950/95 border-r border-slate-200 dark:border-white/10">
                          {sub.total_submitted}
                        </td>

                        {/* Intervals cells */}
                        {sub.intervals.map((inv: FormSubmitterInterval) => {
                          const count = inv.submitted_count;
                          let bgClass =
                            "text-slate-400/50 dark:text-slate-600/60 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/[0.03] hover:bg-slate-200/50 dark:hover:bg-white/[0.05]";
                          if (count >= 5) {
                            bgClass =
                              "bg-gradient-to-br from-emerald-500 to-green-600 text-white font-black shadow-sm shadow-emerald-500/30 border border-emerald-400/60";
                          } else if (count === 4) {
                            bgClass =
                              "bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-950 font-bold shadow-sm shadow-lime-500/25 border border-lime-300/60";
                          } else if (count === 3) {
                            bgClass =
                              "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-sm shadow-amber-500/25 border border-amber-300/60";
                          } else if (count === 2) {
                            bgClass =
                              "bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold shadow-sm shadow-orange-500/30 border border-orange-400/60";
                          } else if (count === 1) {
                            bgClass =
                              "bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold shadow-sm shadow-red-500/30 border border-red-400/50";
                          }

                          return (
                            <td
                              key={inv.slot_index}
                              className={`py-1 px-0.5 text-center text-[9.5px] rounded transition-all font-mono ${bgClass}`}
                              title={`${inv.time_label}: ${count} forms submitted`}
                            >
                              {count > 0 ? count : "·"}
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>

                {/* Floor Total Row */}
                {submitters.length > 0 && (
                  <tr className="bg-slate-100/80 dark:bg-slate-900/90 font-bold text-xs border-t-2 border-slate-300 dark:border-white/20">
                    <td className="py-2.5 px-2.5 sticky left-0 bg-slate-100 dark:bg-slate-900 z-10 text-slate-900 dark:text-white uppercase tracking-wider text-[10.5px]">
                      Floor Total ({submitters.length} Submitters)
                    </td>
                    <td className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-900">
                      {totalFormsSubmitted}
                    </td>
                    {floorIntervalTotals.map((tot) => (
                      <td
                        key={tot.slot_index}
                        className={`py-1.5 px-0.5 text-center text-[9.5px] font-mono ${tot.count > 0
                          ? "text-slate-900 dark:text-white font-extrabold bg-amber-500/10"
                          : "text-slate-400/40"
                          }`}
                        title={`Floor Total ${tot.time_label}: ${tot.count} forms`}
                      >
                        {tot.count > 0 ? tot.count : "·"}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Heatmap Color Distribution Legend */}
        <div className="flex flex-wrap items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-300">Submission Output Velocity:</span>
            <span>Forms submitted per agent per {intervalMinutes}-min slot</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300 dark:border-white/10">
              <span className="text-[10px] text-slate-400">Scale:</span>
              <div
                className="w-20 h-2 rounded-full border border-white/20 shadow-inner"
                style={{
                  background: "linear-gradient(to right, #ef4444, #f97316, #f59e0b, #84cc16, #10b981)",
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
              0
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 text-white font-bold flex items-center justify-center text-[8px]">1</span>
              1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-orange-500 text-white font-bold flex items-center justify-center text-[8px]">2</span>
              2
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 text-slate-900 font-bold flex items-center justify-center text-[8px]">3</span>
              3
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-lime-400 text-slate-900 font-bold flex items-center justify-center text-[8px]">4</span>
              4
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white font-bold flex items-center justify-center text-[8px]">5+</span>
              5+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

