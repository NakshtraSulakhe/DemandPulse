"use client";

import React from "react";
import { Slide1Data } from "@/types";
import { formatNumber, formatPercent } from "@/lib/utils";
import {
  Users,
  UserCheck,
  UserX,
  ClockAlert,
  Target,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface SlideOperationsOverviewProps {
  data?: Slide1Data;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export default function SlideOperationsOverview({
  data,
  isLoading,
  error,
  onRetry,
}: SlideOperationsOverviewProps) {
  if (error && !data) {
    return (
      <div className="w-full glass-panel p-6 rounded-xl border border-rose-500/30 flex flex-col items-center justify-center text-center min-h-[420px]">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2.5 animate-pulse" />
        <h3 className="text-sm font-bold text-white mb-1">CRM Analytics API Error</h3>
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
          <p className="text-xs text-slate-400">Fetching live Operations Overview from CRM API...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpi_cards || {
    total_agents: 0,
    present_today: 0,
    absent_today: 0,
    late_today: 0,
  };

  const campaigns = data?.campaigns || [];
  const lateComers = data?.late_comers || [];

  const attendanceRate =
    kpis.total_agents > 0
      ? Math.round((kpis.present_today / kpis.total_agents) * 100)
      : 0;

  return (
    <div className="w-full flex flex-col gap-3.5 p-1 animate-fadeIn">
      {/* 4 Attendance KPI Cards - Reduced compact sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Agents */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Agents
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-slate-900 dark:text-cyan-300 tv-stat-number tv-stat-number-cyan">
              {formatNumber(kpis.total_agents)}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rostered</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">100%</span> active team headcount
          </div>
        </div>

        {/* Present Today */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Present Today
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tv-stat-number tv-stat-number-emerald">
              {formatNumber(kpis.present_today)}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              {attendanceRate}%
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Punched In</span> on floor
          </div>
        </div>

        {/* Absent Today */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Absent Today
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tv-stat-number tv-stat-number-rose">
              {formatNumber(kpis.absent_today)}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Agents</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="text-rose-600 dark:text-rose-400 font-bold">
              {kpis.total_agents > 0 ? Math.round((kpis.absent_today / kpis.total_agents) * 100) : 0}%
            </span>{" "}
            unplanned & planned leave
          </div>
        </div>

        {/* Late Comers */}
        <div className="glass-panel p-3.5 lg:p-4 rounded-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] lg:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Late Punch-Ins
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ClockAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl xl:text-4xl font-extrabold text-amber-600 dark:text-amber-400 tv-stat-number tv-stat-number-amber">
              {formatNumber(kpis.late_today)}
            </span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
              After grace
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="text-amber-600 dark:text-amber-400 font-bold">{lateComers.length} flagged</span> in logs
          </div>
        </div>
      </div>

      {/* Main Grid: Live Campaigns Table (68%) + Late Comers (32%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Live Campaigns Table */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-4 flex flex-col border border-slate-200/80 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10 mb-2.5">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Live Campaigns Target Allocation & Lead Progress
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Filtered strictly for Live Campaigns (status = &apos;Live&apos; &amp; active = 1)
              </p>
            </div>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {campaigns.length} Live
            </span>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[460px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-300 font-bold sticky top-0 z-10 uppercase tracking-wider text-[10.5px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-2.5">Campaign</th>
                  <th className="py-2.5 px-2 text-center">Monthly</th>
                  <th className="py-2.5 px-2 text-center text-cyan-700 dark:text-cyan-300">Daily Target</th>
                  <th className="py-2.5 px-2 text-center">Generated</th>
                  <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                  <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">Disqual</th>
                  <th className="py-2.5 px-2 text-center text-amber-600 dark:text-amber-400">Pending QA</th>
                  <th className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-300">Remaining</th>
                  <th className="py-2.5 px-2.5 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-medium text-xs">
                      No live campaigns found for this date (status = &apos;Live&apos; &amp; active = 1).
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => {
                    const isComplete = camp.remaining_leads_to_qualify === 0;
                    return (
                      <tr
                        key={camp.campaign_id}
                        className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="py-2 px-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                              {camp.campaign_name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              LIVE
                            </span>
                            {camp.campaign_type && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                                {camp.campaign_type}
                              </span>
                            )}
                          </div>
                          {(camp.description || camp.campaign_description) && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs mt-0.5" title={camp.description || camp.campaign_description || ""}>
                              {camp.description || camp.campaign_description}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">
                              {camp.campaign_code}
                            </span>
                            {camp.client_code && (
                              <span className="text-slate-400 dark:text-slate-500">• {camp.client_code}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                          {formatNumber(camp.monthly_allocation)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-bold text-xs border border-cyan-500/30">
                            {formatNumber(camp.daily_target)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-xs text-slate-900 dark:text-slate-100">
                          {formatNumber(camp.generated_leads)}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {formatNumber(camp.qualified_leads)}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-xs text-rose-600 dark:text-rose-400">
                          {formatNumber(camp.disqualified_leads)}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold text-xs text-amber-600 dark:text-amber-400">
                          {formatNumber(camp.pending_qa)}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-xs text-blue-700 dark:text-blue-300">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Met
                            </span>
                          ) : (
                            formatNumber(camp.remaining_leads_to_qualify)
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 lg:w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  camp.completion_percentage >= 100
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                    : camp.completion_percentage >= 60
                                    ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                    : "bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                }`}
                                style={{ width: `${Math.min(100, camp.completion_percentage)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 w-10 text-right">
                              {formatPercent(camp.completion_percentage)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Late Comers List */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-4 flex flex-col border border-slate-200/80 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/10 mb-2.5">
            <div>
              <h2 className="text-xs lg:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ClockAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Late Comers (Today)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Punch-ins exceeding shift grace window</p>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              {lateComers.length} Flagged
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] flex flex-col gap-2 pr-0.5">
            {lateComers.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500/70 dark:text-emerald-400/70 mb-2" />
                <p className="text-xs font-bold text-slate-900 dark:text-slate-200">Perfect Punctuality</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No late punch-ins recorded for today</p>
              </div>
            ) : (
              lateComers.map((agent) => (
                <div
                  key={agent.user_id}
                  className="p-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-900/70 border border-slate-200 dark:border-white/5 hover:border-amber-400/40 dark:hover:border-amber-500/30 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">
                      {agent.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{agent.full_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{agent.punch_in}</span>
                        <span>• Shift: {agent.shift_start_time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                      +{agent.late_minutes}m
                    </span>
                    <div className="text-[9.5px] text-slate-500 mt-0.5">
                      Grace: {agent.grace_minutes}m
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
