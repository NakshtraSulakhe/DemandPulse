"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck2,
  Calendar,
  Download,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface QaDailySummary {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  work_date: string;
  total_audits: number;
  unique_leads_audited: number;
  qualified_leads: number;
  disqualified_leads: number;
  rework_leads: number;
}

interface QaIntervalMetric {
  id: string;
  crm_qa_agent_id: number;
  qa_agent_name_snapshot: string | null;
  interval_start_at: string;
  interval_end_at: string;
  audited_events: number;
  qualified_events: number;
  unique_leads_qualified: number;
}

export default function QaAnalyticsHistoryPage() {
  const [date, setDate] = useState<string>(getShiftBusinessDate());
  const [summaries, setSummaries] = useState<QaDailySummary[]>([]);
  const [intervals, setIntervals] = useState<QaIntervalMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchQa = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/qa?date=${date}`);
      const json = await res.json();
      if (json.success) {
        const rawSummaries = json.daily_summaries || [];
        const activeSummaries = rawSummaries.filter((s: QaDailySummary) => s.total_audits > 0 || s.qualified_leads > 0);
        setSummaries(activeSummaries.length > 0 ? activeSummaries : rawSummaries);
        setIntervals(json.interval_metrics || []);
      }
    } catch (e) {
      console.error("Failed to load QA analytics:", e);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchQa();
  }, [fetchQa]);

  const totalAudits = summaries.reduce((sum, s) => sum + s.total_audits, 0);
  const totalQualified = summaries.reduce((sum, s) => sum + s.qualified_leads, 0);
  const totalDisqualified = summaries.reduce((sum, s) => sum + s.disqualified_leads, 0);
  const totalRework = summaries.reduce((sum, s) => sum + s.rework_leads, 0);
  const approvalRate = totalAudits > 0 ? Math.round((totalQualified / totalAudits) * 100) : 0;

  const exportCsvUrl = `/api/admin/analytics/qa?format=csv&date=${date}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <span>QA Department Auditing & Heatmap History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed historical QA throughput, 10-minute interval auditing bursts, and qualification rates across the cross-midnight shift.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportCsvUrl}
            download
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">Total Audits</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalAudits}</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-emerald-600 font-semibold mb-1">Qualified Leads</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalQualified}</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-rose-600 font-semibold mb-1">Disqualified</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">{totalDisqualified}</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-amber-600 font-semibold mb-1">Rework Leads</div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{totalRework}</div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-purple-600 font-semibold mb-1">Approval Rate</div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">{approvalRate}%</div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
          </div>
          <span className="text-xs text-slate-500">Selected work date shift (17:30 to 02:30 IST)</span>
        </div>

        <button
          onClick={fetchQa}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* QA Summaries Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          QA Analyst Daily Auditing Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">QA Analyst</th>
                <th className="p-3.5">Total Audits</th>
                <th className="p-3.5">Unique Leads</th>
                <th className="p-3.5">Qualified</th>
                <th className="p-3.5">Disqualified</th>
                <th className="p-3.5">Rework</th>
                <th className="p-3.5">Approval %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading QA snapshots from MySQL...</span>
                    </div>
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No QA snapshot records found for {date}.
                  </td>
                </tr>
              ) : (
                summaries.map((s) => {
                  const rate = s.total_audits > 0 ? Math.round((s.qualified_leads / s.total_audits) * 100) : 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {s.qa_agent_name_snapshot || `QA Analyst #${s.crm_qa_agent_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{s.crm_qa_agent_id}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {s.total_audits}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {s.unique_leads_audited}
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {s.qualified_leads}
                      </td>

                      <td className="p-3.5 font-bold text-rose-600 dark:text-rose-400">
                        {s.disqualified_leads}
                      </td>

                      <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">
                        {s.rework_leads}
                      </td>

                      <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">
                        {rate}%
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
