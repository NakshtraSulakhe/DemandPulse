"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  History,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building,
} from "lucide-react";
import Link from "next/link";

interface DailyRollup {
  work_date: string;
  total_agents: number;
  present_agents: number;
  absent_agents: number;
  late_agents: number;
  campaign_target_points: number;
  floor_capacity_points: number;
  capacity_gap_points: number;
  total_achieved_points: number;
  finalization_status: string;
  finalized_at: string | null;
  revision_number: number;
  synced_at: string;
}

export default function AnalyticsHistoryPage() {
  const [data, setData] = useState<DailyRollup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusUpdatingDate, setStatusUpdatingDate] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/history?status=${statusFilter}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load historical analytics rollups:", e);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpdateStatus = async (workDate: string, newStatus: string) => {
    setStatusUpdatingDate(workDate);
    try {
      const res = await fetch("/api/admin/analytics/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_date: workDate, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchHistory();
      } else {
        alert(json.error || "Failed to update status");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setStatusUpdatingDate(null);
    }
  };

  const totalDays = data.length;
  const finalizedDays = data.filter((d) => d.finalization_status === "finalized").length;
  const provisionalDays = data.filter((d) => d.finalization_status === "provisional").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Daily History & Finalized Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed historical business performance, capacity checkpoints, and multi-state daily report finalization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/analytics/sync-status"
            className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync & Backfill Center</span>
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs text-slate-500 font-semibold mb-1">Total Days Persisted</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalDays}</div>
          <div className="text-[11px] text-slate-400 mt-1">Stored in demandflow_slides</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs text-emerald-600 font-semibold mb-1">Finalized Days</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{finalizedDays}</div>
          <div className="text-[11px] text-slate-400 mt-1">Immutable locked snapshots</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs text-amber-600 font-semibold mb-1">Provisional Days</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{provisionalDays}</div>
          <div className="text-[11px] text-slate-400 mt-1">Live active / pending final cutoff</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs text-indigo-600 font-semibold mb-1">Analytics Shift Engine</div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">5:30 PM – 2:30 AM IST</div>
          <div className="text-[11px] text-slate-400 mt-1">465 Effective Working Mins</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="provisional">Provisional</option>
            <option value="finalizing">Finalizing</option>
            <option value="correction_pending">Correction Pending</option>
            <option value="reconciliation_required">Reconciliation Required</option>
          </select>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Attendance</th>
                <th className="p-3.5">Campaign Target Pts</th>
                <th className="p-3.5">Floor Capacity Pts</th>
                <th className="p-3.5">Capacity Gap</th>
                <th className="p-3.5">Achieved Pts</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Finalization Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading historical rollups from MySQL...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No historical dates recorded yet. Launch a sync or backfill in the Sync Center.
                  </td>
                </tr>
              ) : (
                data.map((row) => {
                  const isFinal = row.finalization_status === "finalized";
                  const isUpdating = statusUpdatingDate === row.work_date;
                  const gap = row.capacity_gap_points;

                  return (
                    <tr key={row.work_date} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{row.work_date}</span>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.present_agents}</span>
                        <span className="text-slate-400"> / {row.total_agents} present</span>
                        {row.late_agents > 0 && (
                          <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                            {row.late_agents} late
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {row.campaign_target_points} pts
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {row.floor_capacity_points} pts
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            gap < 0
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : gap > 0
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {gap < 0 ? `${gap} shortfall` : gap > 0 ? `+${gap} surplus` : "Balanced"}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {row.total_achieved_points} pts
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 ${
                            isFinal
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {isFinal ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span className="capitalize">{row.finalization_status.replace("_", " ")}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {!isFinal ? (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(row.work_date, "finalized")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              Finalize Report
                            </button>
                          ) : (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(row.work_date, "correction_pending")}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium cursor-pointer disabled:opacity-50"
                            >
                              Request Revision
                            </button>
                          )}

                          <Link
                            href={`/admin/analytics/campaigns?date=${row.work_date}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="Inspect Campaigns"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
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
    </div>
  );
}
