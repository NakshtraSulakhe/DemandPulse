"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck2,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Clock,
  ShieldAlert,
  Coins,
  Users,
  Award,
  Info,
  Search,
  Filter,
  RefreshCw,
  FileCheck2,
} from "lucide-react";
import { useIncentiveMutations } from "@/hooks/useIncentiveMutations";
import { useDailyIncentives } from "@/hooks/useDailyIncentives";
import { useIncentivePreview } from "@/hooks/useIncentivePreview";
import { useShiftEngine } from "@/hooks/useShiftEngine";
import { formatINR, formatPercentage, formatPoints } from "@/lib/incentives/formatters";
import { SettlementMode, SettleResponseData } from "@/lib/incentives/types";

export default function SettlementManagementPage() {
  const { shiftState, isShiftActive, businessDate, currentIstFormatted } = useShiftEngine();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    mode: SettlementMode;
    title: string;
    description: string;
  } | null>(null);

  // Premature settlement override state
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const [lastResult, setLastResult] = useState<SettleResponseData | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Table filter and search
  const [tableFilter, setTableFilter] = useState<"eligible" | "all">("eligible");
  const [searchTerm, setSearchTerm] = useState("");

  const { settleMutation } = useIncentiveMutations();
  const dailyQuery = useDailyIncentives({ date: selectedDate });
  const previewQuery = useIncentivePreview(selectedDate);

  // Sync date with current shift business date on initial load if available
  useEffect(() => {
    if (businessDate) {
      setSelectedDate(businessDate);
    }
  }, [businessDate]);

  const settledAgents = dailyQuery.data?.data?.agents || [];
  const settledSummary = dailyQuery.data?.data?.summary;
  const isSettled = settledAgents.length > 0;

  const previewData = previewQuery.data?.data;
  const previewAgents = previewData?.agents || [];

  // Active agents array: if settled use finalized records, otherwise use live preview
  const currentAgents = isSettled ? settledAgents : previewAgents;

  const displayTotalAgents = isSettled
    ? (settledSummary?.total_agents || settledAgents.length)
    : (previewData?.total_agents || previewAgents.length);

  const displayEligibleAgents = isSettled
    ? (settledSummary?.eligible_agents || settledAgents.filter((a) => a.eligibility_status === "eligible" || (Number(a.total_incentive) || 0) > 0).length)
    : (previewData?.eligible_agents || previewAgents.filter((a) => a.eligibility_status === "eligible" || (Number(a.total_incentive) || 0) > 0).length);

  const displayTotalIncentive = isSettled
    ? (settledSummary?.total_incentive || settledAgents.reduce((sum, a) => sum + (Number(a.total_incentive) || 0), 0))
    : (previewData?.total_incentive || previewAgents.reduce((sum, a) => sum + (Number(a.total_incentive) || 0), 0));

  // Filtered agent list for the table
  const filteredList = useMemo(() => {
    return currentAgents.filter((agent: any) => {
      const name = agent.agent_name || "";
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(agent.agent_id || "").includes(searchTerm);
      const isEligible =
        agent.eligibility_status === "eligible" || (Number(agent.total_incentive) || 0) > 0;
      const matchesFilter = tableFilter === "all" ? true : isEligible;
      return matchesSearch && matchesFilter;
    });
  }, [currentAgents, searchTerm, tableFilter]);

  // Shift closure check
  const isCurrentActiveShift =
    Boolean(isShiftActive) &&
    selectedDate === businessDate;

  const handleExecuteMode = async (mode: SettlementMode) => {
    setActionError(null);
    try {
      const payload: {
        work_date: string;
        mode: SettlementMode;
        manager_override?: boolean;
        override_reason?: string;
      } = {
        work_date: selectedDate,
        mode,
      };

      if (mode === "finalize" && isCurrentActiveShift) {
        payload.manager_override = true;
        payload.override_reason = overrideReason || "Manager manual override during active shift";
      }

      const res = await settleMutation.mutateAsync(payload);

      if (res.data) {
        setLastResult(res.data);
      }
      setConfirmModal(null);
      setOverrideAcknowledged(false);
      setOverrideReason("");
      // Refetch daily settled data and preview data
      dailyQuery.refetch();
      previewQuery.refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      setConfirmModal(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            End-of-Day Settlement Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Execute QA scorecard aggregation, finalize daily records, and enforce shift closure cutoff
          </p>
        </div>

        {/* Date Selector & Manual Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setLastResult(null);
                setActionError(null);
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => {
              dailyQuery.refetch();
              previewQuery.refetch();
            }}
            disabled={dailyQuery.isFetching || previewQuery.isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh settlement & preview data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                dailyQuery.isFetching || previewQuery.isFetching ? "animate-spin text-cyan-500" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Action Notification or Error Banner */}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Shift Closure & Status Banner */}
      {isCurrentActiveShift ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                Shift In Progress — Premature Settlement Guard Active
              </div>
              <p className="text-xs mt-0.5 text-amber-700/90 dark:text-amber-300/80">
                US Shift for Business Date <span className="font-mono font-bold">{selectedDate}</span> is currently active (5:30 PM – 2:30 AM IST). Real-time dials and QA scorecards are still being processed. Standard settlement occurs after 02:30 AM IST.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 font-bold flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>IST: {currentIstFormatted || shiftState?.currentIstTime}</span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>
              Shift closed for business date <span className="font-mono font-bold">{selectedDate}</span>. All outbound leads and QA scorecards are finalized and ready for settlement.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            Shift Closed
          </span>
        </div>
      )}

      {/* Current Settlement Status Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Settlement Status for {selectedDate}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isSettled
                ? "Live status from DemandFlow CRM daily settlement table"
                : "Provisional calculation from real-time QA audit scorecards — ready for settlement finalization"}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              isSettled
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : !isCurrentActiveShift
                ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
            }`}
          >
            {isSettled
              ? "FINALIZED SETTLEMENT"
              : !isCurrentActiveShift
              ? "READY FOR SETTLEMENT"
              : "PENDING SHIFT CUTOFF"}
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">
              {isSettled ? "Total Finalized Records" : "Eligible for Settlement"}
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {displayEligibleAgents}
              <span className="text-xs font-normal text-slate-400 ml-1.5">
                / {displayTotalAgents} agents
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isSettled ? "Finalized in database table" : "Provisional QA audit qualified"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">
              {isSettled ? "Total Finalized Incentive" : "Payable Incentive Amount"}
            </span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatINR(displayTotalIncentive)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isSettled ? "Finalized base + slab incentives" : "Calculated base + slab ready to settle"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Scheduler Health</span>
            <div className="mt-1 text-sm font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> CRM Cron Configured
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Runs daily at 02:35 AM IST (Post-Shift Cutoff)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleExecuteMode("dry_run")}
            disabled={settleMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-cyan-500" />
            <span>{settleMutation.isPending ? "Executing..." : "Execute Dry Run (Preview Only)"}</span>
          </button>

          <button
            onClick={() => {
              setOverrideAcknowledged(false);
              setOverrideReason("");
              setConfirmModal({
                open: true,
                mode: "finalize",
                title: "Confirm Settlement Finalization",
                description: `This will aggregate all QA audited leads for ${selectedDate} and generate permanent records in daily_incentive_payouts awaiting manager approval. Total payable: ${formatINR(
                  displayTotalIncentive
                )} across ${displayEligibleAgents} eligible agents.`,
              });
            }}
            disabled={settleMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Finalize Settlement</span>
          </button>

          {isSettled && (
            <button
              onClick={() => {
                setOverrideAcknowledged(false);
                setOverrideReason("");
                setConfirmModal({
                  open: true,
                  mode: "recalculate_unpaid",
                  title: "Recalculate Unpaid Payouts",
                  description: `This will update calculations for unpaid records on ${selectedDate} using any newly completed QA audits. Already paid payouts are strictly protected and will not be altered.`,
                });
              }}
              disabled={settleMutation.isPending}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/70 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recalculate Unpaid</span>
            </button>
          )}
        </div>
      </div>

      {/* Execution Result Box */}
      {lastResult && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-500" />
              Execution Result — Mode: {lastResult.mode.toUpperCase()}
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Processed: {lastResult.total_agents_processed || lastResult.total_agents || 0} agents
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Eligible Agents</span>
              <div className="text-xl font-bold font-mono text-emerald-600">
                {lastResult.eligible_agents_count ?? lastResult.eligible_count ?? 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Total Incentive Calculated</span>
              <div className="text-xl font-bold font-mono text-amber-600">
                {formatINR(lastResult.total_incentive_amount ?? lastResult.total_settled_amount ?? 0)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Database Writes</span>
              <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
                {lastResult.mode === "dry_run"
                  ? "None (Preview Mode)"
                  : `${lastResult.inserted_count ?? lastResult.records_created ?? 0} records finalized`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Calculation & Agent Ledger Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              {isSettled
                ? `Finalized Settlement Records for ${selectedDate}`
                : `Live Calculation Breakdown for Settlement (${selectedDate})`}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isSettled
                ? `Settled records created in daily_incentive_payouts table. Total payable: ${formatINR(displayTotalIncentive)}`
                : `Calculated payable incentive based on live QA scorecard audits. Ready for end-of-day finalization.`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
              <button
                onClick={() => setTableFilter("eligible")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  tableFilter === "eligible"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Eligible ({displayEligibleAgents})
              </button>
              <button
                onClick={() => setTableFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                  tableFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                All ({displayTotalAgents})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-[10.5px] uppercase font-bold text-slate-400">
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-2 text-center">Attendance</th>
                <th className="py-2.5 px-2 text-center">Target / Achieved</th>
                <th className="py-2.5 px-2 text-center">Quota %</th>
                <th className="py-2.5 px-2 text-center">Scored Leads</th>
                <th className="py-2.5 px-2 text-right">Base</th>
                <th className="py-2.5 px-2 text-right">Slab</th>
                <th className="py-2.5 px-3 text-right font-black">Payable Incentive</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No agents match current filters.
                  </td>
                </tr>
              ) : (
                filteredList.map((agent: any) => {
                  const isEligible =
                    agent.eligibility_status === "eligible" || (Number(agent.total_incentive) || 0) > 0;
                  return (
                    <tr
                      key={agent.agent_id || agent.payout_id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {agent.agent_name}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {agent.role || "operations_agent"} • ID #{agent.agent_id}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                          {agent.attendance_status || (agent.is_present ? "Present" : "Absent")}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {agent.achieved_points}
                        </span>
                        <span className="text-slate-400 text-[10px]"> / {agent.target_points} pts</span>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold font-mono ${
                            agent.completion_pct >= 100
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          {agent.completion_pct}%
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center text-[11px]">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {agent.qualified_leads_count || 0} Q
                        </span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span className="text-rose-500">
                          {agent.disqualified_leads_count || 0} D
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatINR(agent.base_incentive || 0)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatINR(agent.slab_incentive || 0)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isEligible
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 line-through"
                          }`}
                        >
                          {formatINR(agent.total_incentive || 0)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {isSettled ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              agent.approval_status === "approved"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : agent.approval_status === "rejected"
                                ? "bg-rose-500/15 text-rose-600"
                                : "bg-amber-500/15 text-amber-600"
                            }`}
                          >
                            {agent.approval_status || "Pending Approval"}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isEligible
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            }`}
                            title={agent.eligibility_reason}
                          >
                            {isEligible ? "Eligible" : "Ineligible"}
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
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0c1220] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmModal.description}
            </p>

            {/* Premature Shift Settlement Guard Warning */}
            {confirmModal.mode === "finalize" && isCurrentActiveShift && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5">
                <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Shift is currently active (Ends 02:30 AM IST)
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-tight">
                  Finalizing settlement right now may exclude leads that have not yet been audited by QA. An explicit manager override is required to proceed prematurely.
                </p>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="override-ack"
                    checked={overrideAcknowledged}
                    onChange={(e) => setOverrideAcknowledged(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="override-ack" className="text-[11px] text-slate-800 dark:text-slate-200 cursor-pointer">
                    I acknowledge that the shift is still active and authorize early settlement.
                  </label>
                </div>

                {overrideAcknowledged && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Override Reason (Required)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Executive holiday cutoff authorization"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecuteMode(confirmModal.mode)}
                disabled={
                  settleMutation.isPending ||
                  (confirmModal.mode === "finalize" &&
                    isCurrentActiveShift &&
                    (!overrideAcknowledged || !overrideReason.trim()))
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {settleMutation.isPending ? "Processing..." : "Confirm & Execute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
