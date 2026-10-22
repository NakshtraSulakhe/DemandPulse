"use client";

import React, { useState, useEffect } from "react";
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
  Shield,
  Zap,
} from "lucide-react";
import { useIncentiveMutations } from "@/hooks/useIncentiveMutations";
import { useDailyIncentives } from "@/hooks/useDailyIncentives";
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

  const { settleMutation } = useIncentiveMutations();
  const dailyQuery = useDailyIncentives({ date: selectedDate });

  // Sync date with current shift business date on initial load if available
  useEffect(() => {
    if (businessDate) {
      setSelectedDate(businessDate);
    }
  }, [businessDate]);

  const isSettled = (dailyQuery.data?.data?.agents?.length ?? 0) > 0;
  const settledSummary = dailyQuery.data?.data?.summary;

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

        {/* Date Selector */}
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
              Live status from DemandFlow CRM daily settlement table
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              isSettled
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
            }`}
          >
            {isSettled ? "FINALIZED SETTLEMENT" : "PENDING CUTOFF"}
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Finalized Records</span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {settledSummary?.total_agents || 0}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {settledSummary?.eligible_agents || 0} eligible agents
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Total Finalized Incentive</span>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatINR(settledSummary?.total_incentive || 0)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Calculated base + slab incentives
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
                description: `This will aggregate all QA audited leads for ${selectedDate} and generate permanent records in daily_incentive_payouts awaiting manager approval. No money will be transferred at this step.`,
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
              Processed: {lastResult.total_agents_processed} agents
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Eligible Agents</span>
              <div className="text-xl font-bold font-mono text-emerald-600">{lastResult.eligible_agents_count}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Total Incentive Calculated</span>
              <div className="text-xl font-bold font-mono text-amber-600">{formatINR(lastResult.total_incentive_amount)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
              <span className="text-[10px] text-slate-400 uppercase">Database Writes</span>
              <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">
                {lastResult.mode === "dry_run" ? "None (Dry Run)" : `${lastResult.inserted_count ?? 0} created`}
              </div>
            </div>
          </div>
        </div>
      )}

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
