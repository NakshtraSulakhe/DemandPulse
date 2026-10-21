"use client";

import React, { useState } from "react";
import { formatNumber, formatPercent } from "@/lib/utils";
import { useCampaignTargets } from "@/hooks/use-slide-analytics";
import { calculateDailyRemaining } from "@/lib/calculations";
import { History, Calendar, Search, RefreshCw, AlertCircle } from "lucide-react";

export default function TargetHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: targetsResponse, isLoading, isError, error, refetch, isFetching } = useCampaignTargets(filterDate);

  const campaigns = targetsResponse?.data?.campaigns || [];

  const filtered = campaigns.filter((item) => {
    const matchesSearch =
      item.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.campaign_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Live Target Allocation History & Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical daily targets, qualified progress, and remaining lead fulfillment fetched from CRM API
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-white/10 text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Refresh history from CRM API"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {error instanceof Error ? error.message : "Failed to fetch target history from CRM API"}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-800 text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* History Table */}
      <div className="glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl flex flex-col">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Fetching live target records from CRM API...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Campaign</th>
                  <th className="py-3 px-2 text-center text-cyan-700 dark:text-cyan-300">Allocated Target</th>
                  <th className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified Leads</th>
                  <th className="py-3 px-2 text-center text-blue-700 dark:text-blue-300">Daily Remaining</th>
                  <th className="py-3 px-3 text-center">Fulfillment</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No target records returned by CRM API for date {filterDate}.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const dailyRemaining = calculateDailyRemaining(item.daily_target, item.qualified_leads);
                    const isMet = dailyRemaining === 0 && item.daily_target > 0;
                    const pct = item.daily_target > 0 ? (item.qualified_leads / item.daily_target) * 100 : 0;

                    return (
                      <tr key={item.campaign_id} className="hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                          {filterDate}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">{item.campaign_name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{item.campaign_code}</div>
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
                            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isMet ? "bg-emerald-400" : "bg-cyan-400"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatPercent(pct)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 text-xs italic">
                          {item.notes || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
