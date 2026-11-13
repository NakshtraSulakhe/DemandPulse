"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Send,
  Users,
  Award,
  Sparkles,
  TrendingUp,
  Percent,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatINR, formatPercentage } from "@/lib/incentives/formatters";
import { formatNumber } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthlyRecord {
  employee_id: number;
  employee_name: string;
  target_month: number;
  target_year: number;
  working_days_assigned: number;
  working_days_present: number;
  daily_target: number;
  assigned_monthly_target: number;
  is_manually_adjusted: boolean;
  adjustment_reason?: string | null;
  achieved_monthly_points: number;
  achievement_pct: number;
  qualifying_threshold_pct: number | null;
  incentive_earned: number;
  qualifying_slab?: { minPct: number; amount: number; label?: string } | null;
  approval_status: string;
  payment_status: string;
  is_settled: boolean;
  is_default_target?: boolean;
}

export default function MonthlyIncentiveView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  const fetchMonthlyData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/incentives/monthly?month=${selectedMonth}&year=${selectedYear}&mode=preview`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.records || []);
        setSummary(json.summary || null);
        setPlan(json.plan || null);
      } else {
        throw new Error(json.error || "Failed to load monthly incentive calculations");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear]);

  // Handle Finalize & Submit to Approvals
  const handleFinalize = async () => {
    if (!confirm(`Finalize monthly incentive calculation for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} and submit to approvals workflow?`)) {
      return;
    }

    setFinalizing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/incentives/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed finalizing monthly incentives");

      setSuccessMsg(json.message);
      fetchMonthlyData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setFinalizing(false);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(
      (r) => r.employee_name.toLowerCase().includes(q) || String(r.employee_id).includes(q)
    );
  }, [records, searchTerm]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Toast notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-500/30 mb-1.5">
            <Award className="w-3.5 h-3.5" />
            Monthly Milestone Accelerators
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Agent Monthly Incentive Calculation & Slabs
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Calculated on cumulative monthly target achievement % using highest qualifying threshold.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month / Year Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFinalize}
            disabled={finalizing || records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 border border-purple-400/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{finalizing ? "Finalizing..." : "Finalize & Submit Payouts"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Total Agents
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summary?.total_agents || 0}
            </div>
            <span className="text-[10px] text-slate-400">Assigned targets</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Qualifying Achievers
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {summary?.eligible_agents || 0}
            </div>
            <span className="text-[10px] text-slate-400">Achieved $\ge$ 90% threshold</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Total Monthly Payout
            </span>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
              {formatINR(summary?.total_incentive_amount || 0)}
            </div>
            <span className="text-[10px] text-slate-400">Projected / Settled rewards</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Plan Status
            </span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {summary?.is_settled ? (
                <span className="text-emerald-600 dark:text-emerald-400">Finalized / Submitted</span>
              ) : (
                <span className="text-cyan-600 dark:text-cyan-400">Live Provisional</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {plan?.slabs?.length || 11} Slabs (90% - 300%)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by agent name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredRecords.length} of {records.length} agents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4 text-center">Days (Present / Total)</th>
                <th className="py-3 px-4 text-right">Monthly Target</th>
                <th className="py-3 px-4 text-right">Achieved Points</th>
                <th className="py-3 px-4 text-center">Achievement %</th>
                <th className="py-3 px-4">Qualifying Slab</th>
                <th className="py-3 px-4 text-right">Monthly Incentive</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Evaluating monthly performance...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No active agent monthly records found for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.employee_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Agent ID: {item.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.working_days_present} / {item.working_days_assigned}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatNumber(item.assigned_monthly_target)} pts
                      </div>
                      {item.is_manually_adjusted ? (
                        <div className="text-[10px] text-amber-500 font-semibold" title={item.adjustment_reason || ""}>
                          Manual Override
                        </div>
                      ) : item.is_default_target ? (
                        <div className="text-[10px] text-slate-400" title="Standard default: 50 pts/day × 22 days">
                          Default Baseline
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {formatNumber(item.achieved_monthly_points)} pts
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
                          item.achievement_pct >= 100
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : item.achievement_pct >= 90
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                        }`}
                      >
                        {item.achievement_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.qualifying_threshold_pct ? (
                        <div className="text-[11px] font-bold text-purple-600 dark:text-purple-300">
                          {item.qualifying_slab?.label || `$\ge$ ${item.qualifying_threshold_pct}% Threshold`}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Below 90% threshold</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {formatINR(item.incentive_earned)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.approval_status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : item.approval_status === "pending_approval"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.approval_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

