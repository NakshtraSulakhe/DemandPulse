"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Slide2Data } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  Target,
  Award,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Sort agents by lead generated count descending (who has generated more leads should be on top)
  const agents = useMemo(() => {
    const rawAgents = data?.agents || [];
    return [...rawAgents].sort((a, b) => {
      const diff = (b.generated_leads ?? 0) - (a.generated_leads ?? 0);
      if (diff !== 0) return diff;
      const ptsDiff = (b.achieved_points ?? 0) - (a.achieved_points ?? 0);
      if (ptsDiff !== 0) return ptsDiff;
      return a.agent_name.localeCompare(b.agent_name);
    });
  }, [data?.agents]);

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

  // Team point aggregations
  const totalTargetPoints = agents.reduce((acc, a) => acc + (a.daily_target_points || 0), 0);
  const totalAchievedPoints = agents.reduce((acc, a) => acc + (a.achieved_points || 0), 0);
  const targetMetCount = agents.filter((a) => a.is_target_met || a.completion_percentage >= 100).length;
  const totalAgents = agents.length;
  const overallTeamPct =
    totalTargetPoints > 0
      ? Math.round((totalAchievedPoints / totalTargetPoints) * 1000) / 10
      : 0;

  if (error && !data) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM Agent Productivity API Error</h3>
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
          <p className="text-xs text-slate-400">Fetching live Agent Productivity from CRM API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3.5 p-1 animate-fadeIn">
      {/* Top Productivity KPI Banner - Reduced compact sizing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Target Pts
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-cyan-300 mt-1.5 tv-stat-number tv-stat-number-cyan">
              {formatNumber(totalTargetPoints)} <span className="text-xs text-cyan-500 dark:text-cyan-400 font-bold">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned daily quota</p>
          </div>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Achieved Points
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 tv-stat-number tv-stat-number-emerald">
              {formatNumber(totalAchievedPoints)} <span className="text-xs text-emerald-500 dark:text-emerald-300 font-bold">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Live verified points</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Target Achievers
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5 tv-stat-number tv-stat-number-amber">
              {targetMetCount} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ {totalAgents}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quota 100%+ accomplished</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 lg:p-4 rounded-xl flex items-center justify-between border border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div>
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Team Completion
            </span>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-cyan-600 dark:text-cyan-300 mt-1.5 tv-stat-number tv-stat-number-cyan">
              {formatPercent(overallTeamPct)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Floor achievement pace</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Rotating Agent Table Container */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 shadow-lg flex flex-col min-h-[460px]">
        {/* Table Header & Carousel Rotation Indicators */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-white/10 mb-2.5 gap-2">
          <div>
            <h2 className="text-xs lg:text-sm font-bold text-white flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Agent Daily Target Points & Lead Distribution
            </h2>
            <p className="text-[11px] text-slate-400">
              Live points target progress with automated frame rotation for comprehensive floor monitoring
            </p>
          </div>

          {/* Carousel Pagination Controls & Rotation Dot Indicators */}
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-400 font-mono">
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
            <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2 px-2.5">Agent</th>
                <th className="py-2 px-2 text-center text-cyan-700 dark:text-cyan-300">Daily Target</th>
                <th className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">Monthly</th>
                <th className="py-2 px-2 text-center text-slate-800 dark:text-slate-300">Generated</th>
                <th className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                <th className="py-2 px-2 text-center text-rose-600 dark:text-rose-400">Disqual</th>
                <th className="py-2 px-2 text-center text-amber-600 dark:text-amber-400">Pending QA</th>
                <th className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">Achieved Pts</th>
                <th className="py-2 px-2 text-center text-blue-700 dark:text-blue-300">Remaining</th>
                <th className="py-2 px-2.5 text-right">Completion</th>
                <th className="py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              <AnimatePresence mode="wait">
                {currentAgents.map((agent) => {
                  const isMet = agent.is_target_met || agent.completion_percentage >= 100;
                  return (
                    <motion.tr
                      key={agent.agent_id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-800 dark:text-slate-100 shadow-sm">
                            {agent.agent_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                              {agent.agent_name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                              {agent.role || "SDR"}
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
                      <td className="py-2 px-2 text-center font-bold text-xs text-slate-900 dark:text-slate-100">
                        {agent.generated_leads}
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
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">0.0</span>
                        ) : (
                          agent.remaining_points
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 lg:w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isMet
                                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                  : agent.completion_percentage >= 60
                                  ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                  : "bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                              }`}
                              style={{ width: `${Math.min(100, agent.completion_percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 w-10 text-right">
                            {formatPercent(agent.completion_percentage)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {isMet ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Met
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
    </div>
  );
}
