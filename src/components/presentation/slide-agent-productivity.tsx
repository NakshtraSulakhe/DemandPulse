"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Slide2Data, CampaignPointBreakdownItem } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  Target,
  Users,
  Award,
  Zap,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  X,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getExampleBenchmarkDataset } from "@/lib/productivity/points-capacity";

interface SlideAgentProductivityProps {
  data?: Slide2Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  rowsPerPage?: number;
}

export default function SlideAgentProductivity({
  data,
  isLoading,
  error,
  onRetry,
  rowsPerPage = 8,
}: SlideAgentProductivityProps) {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [showBreakdownModal, setShowBreakdownModal] = useState<boolean>(false);
  const [datasetMode, setDatasetMode] = useState<"live" | "example">("live");

  // Precomputed canonical example dataset for testing & verification
  const exampleDataset = useMemo(() => getExampleBenchmarkDataset(), []);

  // Determine active dataset (live vs example benchmark)
  const isExampleMode = datasetMode === "example";
  const activeData: Slide2Data | undefined = isExampleMode ? exampleDataset : data;

  // Sort agents by lead generated count descending (who has generated more leads should be on top)
  const agents = useMemo(() => {
    const rawAgents = activeData?.agents || [];
    return [...rawAgents].sort((a, b) => {
      const diff = (b.generated_leads ?? 0) - (a.generated_leads ?? 0);
      if (diff !== 0) return diff;
      const ptsDiff = (b.achieved_points ?? 0) - (a.achieved_points ?? 0);
      if (ptsDiff !== 0) return ptsDiff;
      return a.agent_name.localeCompare(b.agent_name);
    });
  }, [activeData?.agents]);

  // Precompute rank map for top 3 and bottom 3 performers by leads generated
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

  // Group agents into rotating frames
  const chunks: Array<typeof agents> = [];
  for (let i = 0; i < agents.length; i += rowsPerPage) {
    chunks.push(agents.slice(i, i + rowsPerPage));
  }
  const totalPages = Math.max(1, chunks.length);

  // Auto carousel frame rotation
  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setActivePageIndex((prev) => (prev + 1) % totalPages);
    }, 12000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentAgents = chunks[activePageIndex] || [];

  // =========================================================================
  // 1. CAMPAIGN DAILY TARGET POINTS CALCULATION
  // Formula: Campaign Target Points = SUM(Daily Campaign Lead Target × Campaign Type Point Factor)
  // =========================================================================
  const campaignSummary = activeData?.campaign_target_points;
  const totalCampaignTargetPoints = campaignSummary?.total_target_points ?? 0;
  const campaignsCount = campaignSummary?.total_campaigns ?? 0;
  const campaignsBreakdown: CampaignPointBreakdownItem[] = campaignSummary?.campaigns ?? [];

  // =========================================================================
  // 2. FLOOR CAPACITY POINTS CALCULATION
  // Formula: Floor Capacity Points = SUM(Daily Target Points of Present Agents)
  // =========================================================================
  const floorCapacitySummary = activeData?.floor_capacity;

  // Fallback calculation from agents if floor_capacity was not populated
  const presentAgents = useMemo(() => {
    return agents.filter((a) => a.is_present !== false);
  }, [agents]);

  const totalFloorCapacityPoints =
    floorCapacitySummary?.total_capacity_points ??
    presentAgents.reduce((acc, a) => acc + (a.daily_target_points || 0), 0);

  const presentAgentsCount = floorCapacitySummary?.present_agents_count ?? presentAgents.length;
  const totalFloorAgents = floorCapacitySummary?.total_agents ?? agents.length;

  // =========================================================================
  // 3. CAPACITY GAP COMPARISON
  // Formula: Capacity Gap = Floor Capacity Points - Campaign Target Points
  // =========================================================================
  const capacityGap =
    floorCapacitySummary?.capacity_gap ?? (totalFloorCapacityPoints - totalCampaignTargetPoints);

  const capacityGapStatus: "shortfall" | "surplus" | "balanced" =
    floorCapacitySummary?.capacity_gap_status ??
    (capacityGap < 0 ? "shortfall" : capacityGap > 0 ? "surplus" : "balanced");

  const capacityGapLabel =
    floorCapacitySummary?.capacity_gap_label ??
    (capacityGap < 0
      ? `${Math.abs(capacityGap)}-point capacity shortfall`
      : capacityGap > 0
      ? `${capacityGap}-point capacity surplus`
      : "Capacity balanced");

  // =========================================================================
  // 4. VERIFIED ACHIEVEMENT & PACE METRICS
  // =========================================================================
  const totalAchievedPoints = agents.reduce((acc, a) => acc + (a.achieved_points || 0), 0);
  const targetMetCount = agents.filter(
    (a) => a.is_target_met || a.completion_percentage >= 100
  ).length;

  const overallTeamPct =
    totalFloorCapacityPoints > 0
      ? Math.round((totalAchievedPoints / totalFloorCapacityPoints) * 1000) / 10
      : 0;

  if (error && !data && !isExampleMode) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM Agent Productivity API Error</h3>
        <p className="text-xs text-rose-300 max-w-lg mb-3">{error.message}</p>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Retry Fetching Live CRM Data</span>
            </button>
          )}
          <button
            onClick={() => setDatasetMode("example")}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
          >
            Switch to Benchmark Example
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !data && !isExampleMode) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[420px]">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Fetching live Agent Productivity from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3.5 p-1 animate-fadeIn">
      {/* Top Banner Mode Selector & Work Date Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Slide 2 • Agent Productivity & Capacity Alignment
          </span>
          {activeData?.query_date && (
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-cyan-700 dark:text-cyan-400">
              Shift Date: {activeData.query_date}
            </span>
          )}
        </div>

        {/* Toggle between Live CRM and Benchmark Example Dataset */}
        <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-300 dark:border-white/10">
          <button
            onClick={() => setDatasetMode("live")}
            className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all ${
              !isExampleMode
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Live Floor Data
          </button>
          <button
            onClick={() => setDatasetMode("example")}
            className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition-all ${
              isExampleMode
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Load benchmark example dataset (50 pts Campaign Target, 15 pts Floor Capacity)"
          >
            Benchmark Example (50 / 15 pts)
          </button>
        </div>
      </div>

      {/* Top Productivity & Capacity KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CARD 1: Campaign Daily Target Points Card */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex flex-col justify-between border border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-md">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Campaign Target Points
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-cyan-300 mt-1.5 tv-stat-number tv-stat-number-cyan">
                {formatNumber(totalCampaignTargetPoints)}{" "}
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">pts</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Target className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Total points required from today&apos;s campaign allocations.
            </p>
            {campaignsBreakdown.length > 0 && (
              <button
                onClick={() => setShowBreakdownModal(true)}
                className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-1 shrink-0 transition-colors"
                title="View campaign-wise points breakdown"
              >
                <Layers className="w-3 h-3" />
                <span>{campaignsCount} Cmp</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: Floor Capacity Points Card */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex flex-col justify-between border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-md">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Floor Capacity Points
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 tv-stat-number tv-stat-number-emerald">
                {formatNumber(totalFloorCapacityPoints)}{" "}
                <span className="text-xs text-emerald-500 dark:text-emerald-300 font-bold">pts</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Combined daily point targets of agents present today.
            </p>
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shrink-0">
              {presentAgentsCount} / {totalFloorAgents} Present
            </span>
          </div>
        </div>

        {/* CARD 3: Capacity Comparison (Capacity Gap) */}
        <div
          className={`glass-panel p-3.5 lg:p-4 rounded-xl flex flex-col justify-between border relative overflow-hidden group transition-all shadow-md ${
            capacityGapStatus === "shortfall"
              ? "border-amber-500/30 hover:border-amber-500/50"
              : capacityGapStatus === "surplus"
              ? "border-emerald-500/30 hover:border-emerald-500/50"
              : "border-cyan-500/30 hover:border-cyan-500/50"
          }`}
        >
          <div
            className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-xl transition-all ${
              capacityGapStatus === "shortfall"
                ? "bg-amber-500/15 group-hover:bg-amber-500/25"
                : capacityGapStatus === "surplus"
                ? "bg-emerald-500/15 group-hover:bg-emerald-500/25"
                : "bg-cyan-500/15 group-hover:bg-cyan-500/25"
            }`}
          />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Capacity Comparison
              </span>
              <div
                className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-1.5 tv-stat-number ${
                  capacityGapStatus === "shortfall"
                    ? "text-amber-600 dark:text-amber-400 tv-stat-number-amber"
                    : capacityGapStatus === "surplus"
                    ? "text-emerald-600 dark:text-emerald-400 tv-stat-number-emerald"
                    : "text-cyan-600 dark:text-cyan-300 tv-stat-number-cyan"
                }`}
              >
                {capacityGap > 0 ? `+${formatNumber(capacityGap)}` : formatNumber(capacityGap)}{" "}
                <span className="text-xs font-bold">pts</span>
              </div>
            </div>
            <div
              className={`p-2 rounded-xl border ${
                capacityGapStatus === "shortfall"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : capacityGapStatus === "surplus"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
              }`}
            >
              {capacityGapStatus === "shortfall" ? (
                <TrendingDown className="w-4 h-4" />
              ) : capacityGapStatus === "surplus" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <Scale className="w-4 h-4" />
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
            <span
              className={`text-[11px] font-bold truncate ${
                capacityGapStatus === "shortfall"
                  ? "text-amber-700 dark:text-amber-300"
                  : capacityGapStatus === "surplus"
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-cyan-700 dark:text-cyan-300"
              }`}
            >
              {capacityGapLabel}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Floor {totalFloorCapacityPoints} vs {totalCampaignTargetPoints} Cmp
            </span>
          </div>
        </div>

        {/* CARD 4: Achieved Points & Team Pace */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex flex-col justify-between border border-blue-500/20 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-md">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Achieved Points
              </span>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-blue-600 dark:text-blue-300 mt-1.5 tv-stat-number tv-stat-number-cyan">
                {formatNumber(totalAchievedPoints)}{" "}
                <span className="text-xs text-blue-500 dark:text-blue-400 font-bold">pts</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {formatPercent(overallTeamPct)} floor achievement pace
            </p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 shrink-0">
              {targetMetCount} / {presentAgentsCount} Met
            </span>
          </div>
        </div>
      </div>

      {/* Rotating Agent Table Container */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 shadow-lg flex flex-col min-h-[460px]">
        {/* Table Header & Carousel Rotation Indicators */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-white/10 mb-2.5 gap-2">
          <div>
            <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Agent Daily Target Points & Lead Distribution
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live points target progress with automated frame rotation for comprehensive floor monitoring
              </p>
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10 text-[10px]">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-500" /> Top 3 Leads (Green)
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  <TrendingDown className="w-2.5 h-2.5 text-rose-500" /> Bottom 3 Leads (Red)
                </span>
              </div>
            </div>
          </div>

          {/* Carousel Pagination Controls & Rotation Dot Indicators */}
          <div className="flex items-center gap-2.5">
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
                      ? "w-4 bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.6)]"
                      : "w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500"
                  }`}
                  title={`Go to page ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => setActivePageIndex((prev) => (prev - 1 + totalPages) % totalPages)}
                className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActivePageIndex((prev) => (prev + 1) % totalPages)}
                className="p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Animated Table Body */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-700 dark:bg-gray-900/80 dark:text-gray-300 font-bold uppercase tracking-wider text-[10.5px] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="py-2 px-2.5">Agent</th>
                <th className="py-2 px-2 text-center text-blue-700 dark:text-blue-400">Daily Target</th>
                <th className="py-2 px-2 text-center text-gray-600 dark:text-gray-400">Monthly</th>
                <th className="py-2 px-2 text-center text-gray-800 dark:text-gray-300">Generated</th>
                <th className="py-2 px-2 text-center text-green-700 dark:text-green-400">Qualified</th>
                <th className="py-2 px-2 text-center text-red-700 dark:text-red-400">Disqual</th>
                <th className="py-2 px-2 text-center text-orange-700 dark:text-orange-400">Pending QA</th>
                <th className="py-2 px-2 text-center text-green-700 dark:text-green-400 font-bold">Achieved Pts</th>
                <th className="py-2 px-2 text-center text-blue-700 dark:text-blue-300">Remaining</th>
                <th className="py-2 px-2.5 text-right text-gray-700 dark:text-gray-400">Target Progress</th>
                <th className="py-2 px-2 text-center text-gray-700 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              <AnimatePresence mode="wait">
                {currentAgents.map((agent) => {
                  const isMet = agent.is_target_met || agent.completion_percentage >= 100;
                  const isAbsent = agent.is_present === false || agent.attendance_status?.toLowerCase() === "absent";
                  const rankInfo = agentRankMap.get(agent.agent_id);
                  const isTop3 = rankInfo?.isTop3 ?? false;
                  const isBottom3 = rankInfo?.isBottom3 ?? false;
                  const rank = rankInfo?.rank ?? 0;

                  return (
                    <motion.tr
                      key={agent.agent_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-colors group ${
                        isAbsent
                          ? "bg-rose-500/5 hover:bg-rose-500/10 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 opacity-75"
                          : isTop3
                          ? "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30"
                          : isBottom3
                          ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06] dark:bg-rose-950/20 dark:hover:bg-rose-900/30"
                          : "hover:bg-slate-100/60 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-all shrink-0 ${
                              isTop3
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 ring-2 ring-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                : isBottom3
                                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/50 ring-2 ring-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                : "bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {agent.agent_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                            {isTop3 && (
                              <span
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black shadow-sm"
                                title={`Rank #${rank} on Floor`}
                              >
                                {rank}
                              </span>
                            )}
                            {isBottom3 && (
                              <span
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black shadow-sm"
                                title={`Rank #${rank} (Bottom 3 on Floor)`}
                              >
                                !
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span>{agent.agent_name}</span>
                              {isTop3 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9.5px] rounded-full font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                  <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                                  Top {rank}
                                </span>
                              )}
                              {isBottom3 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9.5px] rounded-full font-extrabold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]">
                                  <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
                                  Bottom 3
                                </span>
                              )}
                              {isAbsent && (
                                <span className="px-1.5 py-0.2 text-[9px] rounded font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  Absent
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1.5">
                              <span>{agent.role || "SDR"}</span>
                              <span className="text-slate-400 dark:text-slate-600">•</span>
                              <span className="font-mono text-[9.5px] text-slate-500 dark:text-slate-400">
                                #{rank} of {agents.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-bold text-xs border border-cyan-500/30">
                          {agent.daily_target_points} pts
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-xs text-slate-600 dark:text-slate-400">
                        {agent.monthly_target_points} pts
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-lg inline-block transition-all ${
                            isTop3
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20 font-black"
                              : isBottom3
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {agent.generated_leads}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {agent.qualified_leads}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-xs text-rose-600 dark:text-rose-400">
                        {agent.disqualified_leads}
                      </td>
                      <td className="py-2 px-2 text-center font-semibold text-xs text-amber-600 dark:text-amber-400">
                        {agent.pending_qa}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-lg font-bold text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 shadow-sm">
                          {agent.achieved_points}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-xs text-blue-700 dark:text-blue-300">
                        {agent.remaining_points <= 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                            0.0
                          </span>
                        ) : (
                          agent.remaining_points
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 lg:w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-300 dark:border-gray-600">
                            <div
                              className="h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{
                                width: `${Math.min(100, agent.completion_percentage)}%`,
                                backgroundColor: (() => {
                                  const pct = agent.completion_percentage;
                                  if (pct <= 25) {
                                    const ratio = pct / 25;
                                    const r = Math.round(34 + (255 - 34) * ratio);
                                    const g = Math.round(197 + (0) * ratio);
                                    const b = Math.round(94 + (0) * ratio);
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (pct <= 50) {
                                    const ratio = (pct - 25) / 25;
                                    const r = 255;
                                    const g = Math.round(193 - 53 * ratio);
                                    const b = 0;
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else if (pct <= 75) {
                                    const ratio = (pct - 50) / 25;
                                    const r = 255;
                                    const g = Math.round(140 - 140 * ratio);
                                    const b = 0;
                                    return `rgb(${r}, ${g}, ${b})`;
                                  } else {
                                    const ratio = (pct - 75) / 25;
                                    const r = 255;
                                    const g = Math.round(140 - 140 * ratio);
                                    const b = 0;
                                    return `rgb(${r}, ${g}, ${b})`;
                                  }
                                })(),
                              }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-gray-800 dark:text-gray-200 w-10 text-right">
                            {formatPercent(agent.completion_percentage)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isMet ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Met
                          </span>
                        ) : isAbsent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" /> Absent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                            <Clock className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign-Wise Point Factor Breakdown Modal */}
      <AnimatePresence>
        {showBreakdownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="glass-panel w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl p-5 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Campaign Daily Target Points Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formula: SUM(Daily Campaign Lead Target × Campaign Type Point Factor)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBreakdownModal(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Campaign</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2 text-center">Daily Leads</th>
                      <th className="py-2 px-2 text-center">Factor</th>
                      <th className="py-2 px-3 text-right">Target Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {campaignsBreakdown.map((c) => (
                      <tr key={c.campaign_id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          <div>{c.campaign_name}</div>
                          {c.campaign_code && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {c.campaign_code}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                            {c.campaign_type}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {c.daily_target}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            × {c.point_factor}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-300">
                          {c.target_points} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-slate-900/50 font-bold">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-slate-900 dark:text-white">
                        Total Campaign Daily Target Points
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 dark:text-slate-300">
                        {campaignsBreakdown.reduce((sum, c) => sum + c.daily_target, 0)} leads
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400 text-[10px]">Authoritative</td>
                      <td className="py-2 px-3 text-right font-mono text-cyan-600 dark:text-cyan-300 text-sm">
                        {totalCampaignTargetPoints} pts
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-500" />
                  Factors loaded dynamically from authoritative CRM rules.
                </span>
                <button
                  onClick={() => setShowBreakdownModal(false)}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
