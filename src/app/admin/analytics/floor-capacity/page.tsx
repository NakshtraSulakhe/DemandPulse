"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface FloorSnapshot {
  id: string;
  work_date: string;
  total_agents: number;
  present_agents: number;
  absent_agents: number;
  late_agents: number;
  campaign_target_points: number;
  floor_capacity_points: number;
  capacity_gap_points: number;
  total_achieved_points: number;
  synced_at: string;
}

export default function FloorCapacityHistoryPage() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [records, setRecords] = useState<FloorSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchFloor = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);

      const res = await fetch(`/api/admin/analytics/floor-capacity?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (e) {
      console.error("Failed to load floor capacity history:", e);
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchFloor();
  }, [fetchFloor]);

  const totalDays = records.length;
  const shortfallDays = records.filter((r) => r.capacity_gap_points < 0).length;
  const surplusDays = records.filter((r) => r.capacity_gap_points > 0).length;
  const balancedDays = records.filter((r) => r.capacity_gap_points === 0).length;

  const exportCsvUrl = `/api/admin/analytics/floor-capacity?format=csv${from ? `&from=${from}` : ""}${
    to ? `&to=${to}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Floor Capacity & Capacity Gap Trends</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed historical comparison between campaign target points and present SDR floor capacity points.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportCsvUrl}
            download
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">Days Tracked</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalDays}</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-rose-600 font-semibold mb-1">Shortfall Days (Gap &lt; 0)</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{shortfallDays}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Understaffed vs demand</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-cyan-600 font-semibold mb-1">Surplus Days (Gap &gt; 0)</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">{surplusDays}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sufficient floor headroom</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-emerald-600 font-semibold mb-1">Balanced Days</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{balancedDays}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Exact capacity parity</div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-400">From:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-400">To:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
          </div>

          {(from || to) && (
            <button
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
            >
              Reset Range
            </button>
          )}
        </div>

        <button
          onClick={fetchFloor}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Floor Capacity Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Attendance Ratio</th>
                <th className="p-3.5">Campaign Target Pts</th>
                <th className="p-3.5">Floor Capacity Pts</th>
                <th className="p-3.5">Capacity Gap Pts</th>
                <th className="p-3.5">Status Badge</th>
                <th className="p-3.5">Achieved Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading floor capacity records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No floor capacity records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const gap = r.capacity_gap_points;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{r.work_date}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.present_agents}</span>
                        <span className="text-slate-400"> / {r.total_agents} SDRs</span>
                        {r.late_agents > 0 && (
                          <span className="text-[10px] ml-1.5 text-amber-500 font-medium">({r.late_agents} late)</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {r.campaign_target_points} pts
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {r.floor_capacity_points} pts
                      </td>

                      <td className="p-3.5 font-bold">
                        <span
                          className={`${
                            gap < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : gap > 0
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {gap < 0 ? `${gap} pts` : gap > 0 ? `+${gap} pts` : "0 pts"}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            gap < 0
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : gap > 0
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {gap < 0 ? "Shortfall" : gap > 0 ? "Surplus" : "Balanced"}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {r.total_achieved_points} pts
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
