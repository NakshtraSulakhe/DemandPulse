"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Target,
  Calendar,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface CampaignSnapshot {
  id: string;
  crm_campaign_id: number;
  crm_campaign_code: string | null;
  campaign_name_snapshot: string;
  client_code_snapshot: string | null;
  campaign_type_snapshot: string;
  work_date: string;
  monthly_allocation_snapshot: number;
  daily_target_leads: number;
  campaign_point_factor: number;
  daily_target_points: number;
  generated_leads: number;
  qualified_leads: number;
  disqualified_leads: number;
  pending_qa_leads: number;
  remaining_target_leads: number;
  completion_percentage: number;
  target_achieved: boolean;
  is_final: boolean;
}

export default function CampaignAnalyticsHistoryPage() {
  const [date, setDate] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [records, setRecords] = useState<CampaignSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (date) q.set("date", date);
      if (clientFilter && clientFilter !== "all") q.set("client_code", clientFilter);
      if (searchTerm) q.set("search", searchTerm);

      const res = await fetch(`/api/admin/analytics/campaigns?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (e) {
      console.error("Failed to load campaign snapshots:", e);
    } finally {
      setIsLoading(false);
    }
  }, [date, clientFilter, searchTerm]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Extract distinct client codes for filter dropdown
  const distinctClients = Array.from(
    new Set(records.map((r) => r.client_code_snapshot).filter(Boolean))
  ).sort();

  const totalTargetLeads = records.reduce((sum, r) => sum + r.daily_target_leads, 0);
  const totalTargetPoints = records.reduce((sum, r) => sum + r.daily_target_points, 0);
  const totalQualified = records.reduce((sum, r) => sum + r.qualified_leads, 0);
  const totalGenerated = records.reduce((sum, r) => sum + r.generated_leads, 0);
  const achievedCampaigns = records.filter((r) => r.target_achieved).length;

  const exportCsvUrl = `/api/admin/analytics/campaigns?format=csv${date ? `&date=${date}` : ""}${
    clientFilter !== "all" ? `&client_code=${clientFilter}` : ""
  }`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Target className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Campaign Daily Snapshots & Completion</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Database-backed historical campaign lead targets, point factors, MQL/BANT allocations, and overachievement records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={exportCsvUrl}
            download
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-slate-500 font-semibold mb-1">Target Leads / Points</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {totalTargetLeads} <span className="text-xs font-normal text-slate-400">({totalTargetPoints} pts)</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-emerald-600 font-semibold mb-1">Qualified Leads</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalQualified}
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-blue-600 font-semibold mb-1">Generated Leads</div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
            {totalGenerated}
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-[11px] text-indigo-600 font-semibold mb-1">Target Met</div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {achievedCampaigns} <span className="text-xs font-normal text-slate-400">/ {records.length}</span>
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-purple-600 font-semibold mb-1">Floor Delivery Rate</div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {totalTargetLeads > 0 ? Math.round((totalQualified / totalTargetLeads) * 100) : 0}%
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

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
          >
            <option value="all">All Clients</option>
            {distinctClients.map((c) => (
              <option key={c} value={c!}>
                {c}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campaign name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-medium placeholder-slate-400 outline-none w-52 sm:w-64"
            />
          </div>
        </div>

        <button
          onClick={fetchCampaigns}
          className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Campaign Name & Code</th>
                <th className="p-3.5">Client</th>
                <th className="p-3.5">Type & Factor</th>
                <th className="p-3.5">Target Leads / Pts</th>
                <th className="p-3.5">Qualified</th>
                <th className="p-3.5">Remaining</th>
                <th className="p-3.5">Completion %</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading campaign snapshots from database...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No campaign snapshots found for the selected criteria.
                  </td>
                </tr>
              ) : (
                records.map((c) => {
                  const pct = Number(c.completion_percentage);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {c.work_date}
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white max-w-xs truncate" title={c.campaign_name_snapshot}>
                          {c.campaign_name_snapshot}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {c.crm_campaign_code || `#${c.crm_campaign_id}`}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                          {c.client_code_snapshot || "N/A"}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <span>{c.campaign_type_snapshot}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({c.campaign_point_factor}x)</span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {c.daily_target_leads} <span className="text-[10px] text-slate-400 font-normal">({c.daily_target_points} pts)</span>
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {c.qualified_leads}
                      </td>

                      <td className="p-3.5 font-medium text-slate-500">
                        {c.remaining_target_leads}
                      </td>

                      <td className="p-3.5 font-bold">
                        <span
                          className={`${
                            pct >= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : pct >= 50
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.target_achieved
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {c.target_achieved ? "Achieved" : "In Progress"}
                        </span>
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
