"use client";

import React, { useState, useMemo } from "react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { useCampaignTargets, useAllocationHistory } from "@/hooks/use-slide-analytics";
import { calculateDailyRemaining } from "@/lib/calculations";
import { AdminCampaignTargetItem } from "@/types";
import {
  History,
  Calendar,
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function TargetHistoryPage() {
  const [activeTab, setActiveTab] = useState<"allocations" | "audit">("allocations");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });

  // Query 1: Campaign Targets Snapshot for date
  const {
    data: targetsResponse,
    isLoading: isTargetsLoading,
    isError: isTargetsError,
    error: targetsError,
    refetch: refetchTargets,
    isFetching: isTargetsFetching,
  } = useCampaignTargets(filterDate);

  // Query 2: Detailed Allocation Audit Trail
  const {
    data: auditResponse,
    isLoading: isAuditLoading,
    isError: isAuditError,
    error: auditError,
    refetch: refetchAudit,
    isFetching: isAuditFetching,
  } = useAllocationHistory({ date: filterDate, limit: 200 });

  const campaigns: AdminCampaignTargetItem[] = useMemo(
    () => targetsResponse?.data?.campaigns || [],
    [targetsResponse?.data?.campaigns]
  );

  const filteredCampaigns = useMemo(() => {
    if (!searchTerm.trim()) return campaigns;
    const q = searchTerm.toLowerCase();
    return campaigns.filter((item: AdminCampaignTargetItem) => {
      return (
        item.campaign_name.toLowerCase().includes(q) ||
        (item.campaign_code && item.campaign_code.toLowerCase().includes(q)) ||
        (item.client_code && item.client_code.toLowerCase().includes(q)) ||
        String(item.campaign_id).includes(q)
      );
    });
  }, [campaigns, searchTerm]);

  const auditRecords = useMemo(
    () => auditResponse?.records || [],
    [auditResponse?.records]
  );

  const filteredAuditRecords = useMemo(() => {
    if (!searchTerm.trim()) return auditRecords;
    const q = searchTerm.toLowerCase();
    return auditRecords.filter((rec) => {
      return (
        (rec.campaign_name && rec.campaign_name.toLowerCase().includes(q)) ||
        (rec.client_code && rec.client_code.toLowerCase().includes(q)) ||
        String(rec.campaign_id).includes(q) ||
        rec.changed_by.toLowerCase().includes(q) ||
        rec.operation_type.toLowerCase().includes(q)
      );
    });
  }, [auditRecords, searchTerm]);

  const handleRefresh = () => {
    if (activeTab === "allocations") {
      refetchTargets();
    } else {
      refetchAudit();
    }
  };

  const isFetching = isTargetsFetching || isAuditFetching;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Target Allocation History &amp; Audit Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical daily targets, database persistence logs, and audit trail for US Eastern business dates
          </p>
        </div>

        {/* Tab switcher, Date Selector & Search */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("allocations")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "allocations"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Daily Allocations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "audit"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
              {auditRecords.length > 0 && (
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {auditRecords.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-purple-500" : ""}`} />
          </button>
        </div>
      </div>

      {(isTargetsError || isAuditError) && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {targetsError instanceof Error
                ? targetsError.message
                : auditError instanceof Error
                ? auditError.message
                : "Failed to fetch history"}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-800 text-white font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col">
        {activeTab === "allocations" ? (
          /* Allocations Table */
          isTargetsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400">Loading daily allocations for {filterDate}...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Campaign</th>
                    <th className="py-3 px-2 text-center text-cyan-700 dark:text-cyan-300">Daily Target</th>
                    <th className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified Leads</th>
                    <th className="py-3 px-2 text-center text-blue-700 dark:text-blue-300">Daily Remaining</th>
                    <th className="py-3 px-3 text-center">Fulfillment</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No target records found for date {filterDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((item: AdminCampaignTargetItem) => {
                      const dailyRemaining = calculateDailyRemaining(item.daily_target, item.qualified_leads);
                      const isMet = dailyRemaining === 0 && item.daily_target > 0;
                      const pct = item.daily_target > 0 ? (item.qualified_leads / item.daily_target) * 100 : 0;

                      return (
                        <tr
                          key={item.campaign_id}
                          className="hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                            {filterDate}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.campaign_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {item.client_code || item.campaign_code}
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-center font-bold text-cyan-700 dark:text-cyan-300">
                            {formatNumber(item.daily_target)}
                          </td>
                          <td className="py-3.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNumber(item.qualified_leads)}
                          </td>
                          <td className="py-3.5 px-2 text-center font-medium text-slate-700 dark:text-slate-300">
                            {isMet ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">0 (Met)</span>
                            ) : (
                              formatNumber(dailyRemaining)
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isMet ? "bg-emerald-500" : "bg-cyan-500"
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {formatPercent(pct)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-xs">
                            {item.has_saved_allocation ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Saved in DB
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Default / Unsaved
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Audit Trail Table */
          isAuditLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-400">Loading audit trail records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="py-3 px-3">Timestamp (UTC)</th>
                    <th className="py-3 px-3">Business Date</th>
                    <th className="py-3 px-3">Campaign</th>
                    <th className="py-3 px-2 text-center">Previous Target</th>
                    <th className="py-3 px-2 text-center text-cyan-700 dark:text-cyan-300">New Target</th>
                    <th className="py-3 px-2 text-center">Operation</th>
                    <th className="py-3 px-3">Changed By</th>
                    <th className="py-3 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAuditRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No audit history records found for business date {filterDate}.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {rec.change_timestamp?.replace("T", " ")?.substring(0, 19)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {rec.business_date}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {rec.campaign_name || `Campaign #${rec.campaign_id}`}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {rec.client_code || `ID ${rec.campaign_id}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-2 text-center text-slate-500 dark:text-slate-400 font-mono">
                          {rec.previous_target !== null ? formatNumber(rec.previous_target) : "—"}
                        </td>
                        <td className="py-3.5 px-2 text-center font-bold text-cyan-700 dark:text-cyan-300 font-mono">
                          {formatNumber(rec.new_target)}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              rec.operation_type === "INSERT"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                            }`}
                          >
                            {rec.operation_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {rec.changed_by}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs italic">
                          {rec.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
