"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface IncentiveSnapshot {
  id: string;
  crm_payout_id: number | null;
  crm_agent_id: number;
  agent_name_snapshot: string | null;
  work_date: string;
  target_points: number;
  achieved_points: number;
  qualified_leads: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  eligibility_status: string;
  approval_status: string;
  payment_status: string;
  crm_payment_reference: string | null;
  is_final: boolean;
}

export default function IncentiveReportingHistoryPage() {
  const [date, setDate] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [records, setRecords] = useState<IncentiveSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchIncentives = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (date) q.set("date", date);
      if (paymentFilter && paymentFilter !== "all") q.set("payment_status", paymentFilter);

      const res = await fetch(`/api/admin/analytics/incentives?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (e) {
      console.error("Failed to load incentive reporting archive:", e);
    } finally {
      setIsLoading(false);
    }
  }, [date, paymentFilter]);

  useEffect(() => {
    fetchIncentives();
  }, [fetchIncentives]);

  const totalEarned = records.reduce((sum, r) => sum + r.total_incentive, 0);
  const totalBase = records.reduce((sum, r) => sum + r.base_incentive, 0);
  const totalSlab = records.reduce((sum, r) => sum + r.slab_incentive, 0);
  const paidCount = records.filter((r) => r.payment_status === "paid").length;

  const exportCsvUrl = `/api/admin/analytics/incentives?format=csv${date ? `&date=${date}` : ""}${
    paymentFilter !== "all" ? `&payment_status=${paymentFilter}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-amber-500" />
            <span>Daily Incentive Reporting Archive</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed reporting copies of settled SDR daily incentives, base payouts, slab accelerations, and CRM payment references.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportCsvUrl}
            download
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">Total Incentives Recorded</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            ₹{totalEarned.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-emerald-600 font-semibold mb-1">Base Incentives (100% Target)</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{totalBase.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-cyan-600 font-semibold mb-1">Slab Overachievement</div>
          <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
            ₹{totalSlab.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-indigo-600 font-semibold mb-1">Disbursed / Paid Records</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {paidCount} <span className="text-xs font-normal text-slate-400">/ {records.length} records</span>
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
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid (Disbursed)</option>
              <option value="approved">Approved (Pending Transfer)</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchIncentives}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Incentives Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Agent</th>
                <th className="p-3.5">Target / Achieved</th>
                <th className="p-3.5">Qualified Leads</th>
                <th className="p-3.5">Base Incentive</th>
                <th className="p-3.5">Slab Incentive</th>
                <th className="p-3.5">Total Incentive</th>
                <th className="p-3.5">Payment Status</th>
                <th className="p-3.5">CRM Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading incentive reporting archive from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No incentive reporting records found for selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isPaid = r.payment_status === "paid";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {r.work_date}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {r.agent_name_snapshot || `Agent #${r.crm_agent_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{r.crm_agent_id}
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span className="font-bold">{r.achieved_points}</span> / {r.target_points} pts
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {r.qualified_leads} leads
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-mono">
                        ₹{r.base_incentive}
                      </td>

                      <td className="p-3.5 text-cyan-600 dark:text-cyan-400 font-mono">
                        ₹{r.slab_incentive}
                      </td>

                      <td className="p-3.5 font-black text-amber-500 font-mono">
                        ₹{r.total_incentive}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : r.payment_status === "approved"
                              ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {r.payment_status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {r.crm_payment_reference || "—"}
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
