"use client";

import React, { useState, useEffect } from "react";
import { useCampaignTargets, useSaveCampaignTargets } from "@/hooks/use-slide-analytics";
import { formatNumber, formatPercent } from "@/lib/utils";
import { calculateDailyRemaining } from "@/lib/calculations";
import {
  Target,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";

export default function CampaignTargetsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [targetDrafts, setTargetDrafts] = useState<Record<number, { target: number; notes: string }>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: targetsData, isLoading, isFetching, refetch } = useCampaignTargets(selectedDate);
  const saveMutation = useSaveCampaignTargets();

  const campaigns = targetsData?.data?.campaigns || [];

  // Initialize draft inputs when data loads or changes
  useEffect(() => {
    if (campaigns.length > 0) {
      const initial: Record<number, { target: number; notes: string }> = {};
      campaigns.forEach((c) => {
        initial[c.campaign_id] = {
          target: c.daily_target || 0,
          notes: c.notes || "",
        };
      });
      setTargetDrafts(initial);
    }
  }, [campaigns]);

  const handleTargetChange = (campaignId: number, val: number) => {
    const safeVal = Math.max(0, val);
    setTargetDrafts((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { notes: "" }),
        target: safeVal,
      },
    }));
  };

  const handleNotesChange = (campaignId: number, val: string) => {
    setTargetDrafts((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { target: 0 }),
        notes: val,
      },
    }));
  };

  // Save single campaign
  const handleSaveSingle = async (campaignId: number) => {
    const draft = targetDrafts[campaignId];
    if (!draft) return;

    setSaveStatus(null);
    try {
      await saveMutation.mutateAsync({
        target_date: selectedDate,
        targets: [
          {
            campaign_id: campaignId,
            daily_target: draft.target,
            notes: draft.notes,
          },
        ],
      });
      setSaveStatus({
        type: "success",
        message: "Campaign target saved successfully and synced with Slide 1.",
      });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save target";
      setSaveStatus({ type: "error", message: msg });
    }
  };

  // Save all campaigns in batch
  const handleSaveAll = async () => {
    setSaveStatus(null);
    const targets = campaigns.map((c) => ({
      campaign_id: c.campaign_id,
      daily_target: targetDrafts[c.campaign_id]?.target ?? c.daily_target,
      notes: targetDrafts[c.campaign_id]?.notes ?? c.notes,
    }));

    try {
      await saveMutation.mutateAsync({
        target_date: selectedDate,
        targets,
      });
      setSaveStatus({
        type: "success",
        message: `All ${targets.length} campaign daily targets saved! Slide 1 is updated.`,
      });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save targets";
      setSaveStatus({ type: "error", message: msg });
    }
  };

  // Totals calculations
  const totalAllocatedMonthly = campaigns.reduce((acc, c) => acc + (c.monthly_allocation || 0), 0);
  const totalDailyTargets = campaigns.reduce((acc, c) => {
    const draftVal = targetDrafts[c.campaign_id]?.target;
    return acc + (draftVal !== undefined ? draftVal : c.daily_target || 0);
  }, 0);
  const totalQualifiedToday = campaigns.reduce((acc, c) => acc + (c.qualified_leads || 0), 0);
  const totalGeneratedToday = campaigns.reduce((acc, c) => acc + (c.generated_leads || 0), 0);
  const totalDailyRemaining = calculateDailyRemaining(totalDailyTargets, totalQualifiedToday);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Campaign Daily Targets Allocation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Allocate daily campaign targets and monitor real-time fulfillment across qualified leads
          </p>
        </div>

        {/* Date Selector & Batch Save */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh CRM campaigns"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || campaigns.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 border border-cyan-400/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saveMutation.isPending ? "Saving..." : "Save All Targets"}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            saveStatus.type === "success"
              ? "bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-400/50 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-100/90 dark:bg-rose-950/60 border-rose-400/50 dark:border-rose-500/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          <button onClick={() => setSaveStatus(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Monthly Alloc
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatNumber(totalAllocatedMonthly)} <span className="text-xs text-slate-500 dark:text-slate-400">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Verified contract allocations</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Target Total
          </span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {formatNumber(totalDailyTargets)} <span className="text-xs text-cyan-700 dark:text-cyan-300">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned for {selectedDate}</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Today Qualified
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNumber(totalQualifiedToday)} <span className="text-xs text-emerald-700 dark:text-emerald-300">leads</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatPercent(totalDailyTargets > 0 ? (totalQualifiedToday / totalDailyTargets) * 100 : 0)} achieved
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Remaining
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-300 mt-1">
            {formatNumber(totalDailyRemaining)} <span className="text-xs text-blue-700 dark:text-blue-200">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            MAX(0, Target - Qualified)
          </p>
        </div>
      </div>

      {/* Target Allocation Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/10 mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Live CRM Campaigns & Daily Target Controls
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Allocated target values persist to CRM MySQL table <code className="font-mono text-cyan-700 dark:text-cyan-300">campaign_daily_targets</code>
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Rule: Daily Remaining = MAX(0, Target - Qualified)</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Loading campaign targets from CRM...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-3 px-3">Campaign & Client</th>
                  <th className="py-3 px-2 text-center">Monthly Alloc</th>
                  <th className="py-3 px-3 text-center text-cyan-700 dark:text-cyan-300 min-w-[130px]">
                    Daily Target (Input)
                  </th>
                  <th className="py-3 px-2 text-center">Generated</th>
                  <th className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                  <th className="py-3 px-2 text-center text-rose-600 dark:text-rose-400">Disqual</th>
                  <th className="py-3 px-2 text-center text-amber-600 dark:text-amber-400">Pending QA</th>
                  <th className="py-3 px-2 text-center text-blue-700 dark:text-blue-300 font-bold">Daily Remaining</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Progress</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No live campaigns returned by CRM API for this date.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((camp) => {
                    const draft = targetDrafts[camp.campaign_id] || {
                      target: camp.daily_target,
                      notes: camp.notes || "",
                    };
                    const targetVal = draft.target;
                    const dailyRemaining = calculateDailyRemaining(targetVal, camp.qualified_leads);
                    const pct = targetVal > 0 ? Math.round((camp.qualified_leads / targetVal) * 1000) / 10 : 0;
                    const isMet = dailyRemaining === 0 && targetVal > 0;

                    return (
                      <tr key={camp.campaign_id} className="hover:bg-slate-100/60 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-slate-900 dark:text-white">{camp.campaign_name}</div>
                            {camp.campaign_type && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                                {camp.campaign_type}
                              </span>
                            )}
                          </div>
                          {(camp.description || camp.campaign_description) && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-md" title={camp.description || camp.campaign_description || ""}>
                              {camp.description || camp.campaign_description}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                              {camp.campaign_code}
                            </span>
                            {camp.client_code && (
                              <span className="text-slate-400 dark:text-slate-500">• {camp.client_code}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-2 text-center font-medium text-slate-700 dark:text-slate-300">
                          {formatNumber(camp.monthly_allocation)}
                        </td>

                        {/* Editable Daily Target Input */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={targetVal}
                              onChange={(e) =>
                                handleTargetChange(
                                  camp.campaign_id,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-20 px-2.5 py-1 text-center font-bold text-cyan-800 dark:text-cyan-300 bg-white dark:bg-slate-900 border border-cyan-500/50 dark:border-cyan-500/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-400 text-xs shadow-inner"
                            />
                            <span className="text-[10px] text-slate-500">leads</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {formatNumber(camp.generated_leads)}
                        </td>

                        <td className="py-3.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(camp.qualified_leads)}
                        </td>

                        <td className="py-3.5 px-2 text-center text-rose-400">
                          {formatNumber(camp.disqualified_leads)}
                        </td>

                        <td className="py-3.5 px-2 text-center text-amber-400">
                          {formatNumber(camp.pending_qa)}
                        </td>

                        {/* Calculated Daily Remaining */}
                        <td className="py-3.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              isMet
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {isMet ? "Met (0)" : dailyRemaining}
                          </span>
                        </td>

                        {/* Progress Bar */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100
                                    ? "bg-emerald-400"
                                    : pct >= 50
                                    ? "bg-cyan-400"
                                    : "bg-amber-400"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatPercent(pct)}
                            </span>
                          </div>
                        </td>

                        {/* Save Single Action */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleSaveSingle(camp.campaign_id)}
                            disabled={saveMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[11px] font-medium transition-colors"
                          >
                            Save
                          </button>
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
