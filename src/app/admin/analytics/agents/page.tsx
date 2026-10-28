"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  Clock,
  Gauge,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface AgentSnapshot {
  id: string;
  crm_agent_id: number;
  agent_name_snapshot: string;
  work_date: string;
  daily_target_points: number;
  achieved_points: number;
  qualified_leads: number;
  disqualified_leads: number;
  generated_leads: number;
  pending_qa_leads: number;
  remaining_target_points: number;
  target_completion_pct: number;
  attendance_status_snapshot: string;
  effective_work_minutes: number;
  elapsed_work_minutes: number;
  expected_points_at_snapshot: number;
  productivity_pace_pct: number | null;
  pace_status: "slow" | "steady" | "ahead" | "pre_shift" | null;
  is_final: boolean;
}

export default function AgentProductivityHistoryPage() {
  const [date, setDate] = useState<string>("");
  const [paceFilter, setPaceFilter] = useState<string>("all");
  const [records, setRecords] = useState<AgentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (date) q.set("date", date);
      if (paceFilter && paceFilter !== "all") q.set("pace_status", paceFilter);

      const res = await fetch(`/api/admin/analytics/agents?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (e) {
      console.error("Failed to load agent productivity snapshots:", e);
    } finally {
      setIsLoading(false);
    }
  }, [date, paceFilter]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const totalAgents = records.length;
  const presentCount = records.filter(
    (r) => r.attendance_status_snapshot.toLowerCase() !== "absent"
  ).length;
  const totalTargetPoints = records.reduce((sum, r) => sum + r.daily_target_points, 0);
  const totalAchievedPoints = records.reduce((sum, r) => sum + r.achieved_points, 0);
  const aheadCount = records.filter((r) => r.pace_status === "ahead").length;
  const slowCount = records.filter((r) => r.pace_status === "slow").length;

  const exportCsvUrl = `/api/admin/analytics/agents?format=csv${date ? `&date=${date}` : ""}${
    paceFilter !== "all" ? `&pace_status=${paceFilter}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Agent Daily Productivity & Time Pace</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed agent points achievement, elapsed time checkpoints, and 465-minute verified effective work schedule pacing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportCsvUrl}
            download
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">Total SDRs / Present</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {presentCount} <span className="text-xs font-normal text-slate-400">/ {totalAgents} present</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-emerald-600 font-semibold mb-1">Achieved / Target Points</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalAchievedPoints} <span className="text-xs font-normal text-slate-400">/ {totalTargetPoints} pts</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-cyan-600 font-semibold mb-1">Ahead of Pace (&gt;80%)</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {aheadCount} SDRs
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-amber-600 font-semibold mb-1">Behind Pace (0–30%)</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {slowCount} SDRs
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
            {date && (
              <button
                onClick={() => setDate("")}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={paceFilter}
              onChange={(e) => setPaceFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="all">All Pace Bands</option>
              <option value="ahead">Ahead of Schedule (&gt;80%)</option>
              <option value="steady">Steady Progress (&gt;30–80%)</option>
              <option value="slow">Pacing Alert (0–30%)</option>
              <option value="pre_shift">Pre-Shift (Not Started)</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchAgents}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Agents Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Agent Name</th>
                <th className="p-3.5">Attendance</th>
                <th className="p-3.5">Target Pts</th>
                <th className="p-3.5">Achieved Pts</th>
                <th className="p-3.5">Expected Pts</th>
                <th className="p-3.5">Time Pace %</th>
                <th className="p-3.5">Pace Status</th>
                <th className="p-3.5">Qualified Leads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading agent productivity snapshots from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No agent productivity snapshots found for the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((a) => {
                  const pace = a.productivity_pace_pct;
                  const isPresent = a.attendance_status_snapshot.toLowerCase() !== "absent";

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {a.work_date}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {a.agent_name_snapshot}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{a.crm_agent_id}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPresent
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {a.attendance_status_snapshot}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {a.daily_target_points} pts
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {a.achieved_points} pts
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {a.expected_points_at_snapshot} pts
                      </td>

                      <td className="p-3.5 font-bold">
                        {pace !== null ? (
                          <span
                            className={`${
                              pace > 80
                                ? "text-emerald-600 dark:text-emerald-400"
                                : pace > 30
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {pace}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-normal">Pre-Shift</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            a.pace_status === "ahead"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : a.pace_status === "steady"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : a.pace_status === "slow"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {a.pace_status === "ahead"
                            ? "Ahead"
                            : a.pace_status === "steady"
                            ? "Steady"
                            : a.pace_status === "slow"
                            ? "Slow Pace"
                            : "Pre-Shift"}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {a.qualified_leads} leads
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
