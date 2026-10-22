"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Coins,
  Users,
  Clock,
  CheckCircle2,
  SendHorizontal,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useDailyIncentives } from "@/hooks/useDailyIncentives";
import { useIncentivePreview } from "@/hooks/useIncentivePreview";
import { formatINR, formatPercentage, formatPoints, getEligibilityBadgeClass } from "@/lib/incentives/formatters";
import IncentiveWorkflowStepper from "@/components/incentives/workflow-stepper";

export default function IncentiveDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Query settled daily records
  const dailyQuery = useDailyIncentives({ date: selectedDate });
  // Query provisional preview (used as real-time calculation source)
  const previewQuery = useIncentivePreview(selectedDate);

  const isFetching = dailyQuery.isFetching || previewQuery.isFetching;

  // Determine if date has finalized settled records in daily_incentive_payouts
  const isSettled = (dailyQuery.data?.data?.agents?.length ?? 0) > 0;
  const settledData = dailyQuery.data?.data;
  const previewData = previewQuery.data?.data;

  // Active agents array: if settled, use settled records; otherwise preview provisional records
  const rawAgents = useMemo(() => {
    if (isSettled && settledData?.agents) {
      return settledData.agents;
    }
    return previewData?.agents || [];
  }, [isSettled, settledData, previewData]);

  // Financial KPI totals:
  // Use settled summary if available, else derive from preview
  const totalIncentiveEarned = isSettled
    ? settledData?.summary?.total_incentive || 0
    : previewData?.total_incentive || 0;

  const eligibleCount = isSettled
    ? settledData?.summary?.eligible_agents || 0
    : previewData?.eligible_agents || 0;

  const totalAgents = isSettled
    ? settledData?.summary?.total_agents || rawAgents.length
    : previewData?.total_agents || rawAgents.length;

  const pendingApprovalAmount = settledData?.summary?.pending_approval_amount || 0;
  const approvedUnpaidAmount = settledData?.summary?.approved_unpaid_amount || 0;
  const paidAmount = settledData?.summary?.paid_amount || 0;

  // Filtered agent list
  const filteredAgents = useMemo(() => {
    return rawAgents.filter((agent) => {
      const matchesSearch =
        agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(agent.agent_id).includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ? true : agent.eligibility_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rawAgents, searchTerm, statusFilter]);

  // Paginated agents
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAgents.length / pageSize) || 1;

  const handleRefresh = () => {
    dailyQuery.refetch();
    previewQuery.refetch();
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            Automated Daily Incentive & Payout Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time QA lead audit calculations, target achievement thresholds, settlement cutoff, and payout execution
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh Incentive Pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>

          <Link
            href="/admin/incentives/settlements"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <span>Settlement Console</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 7 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* 1. Total Incentives Earned */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Earned
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
            {formatINR(totalIncentiveEarned)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            {isSettled ? "Finalized settlement" : "Provisional live QA"}
          </div>
        </div>

        {/* 2. Eligible Agents */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Eligible Agents
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl xl:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {eligibleCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ {totalAgents}</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {totalAgents > 0 ? Math.round((eligibleCount / totalAgents) * 100) : 0}% met 100% target
          </div>
        </div>

        {/* 3. Pending Manager Approval */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Approval
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
            {formatINR(pendingApprovalAmount)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Awaiting manager sign-off
          </div>
        </div>

        {/* 4. Approved for Payment */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Approved
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-cyan-700 dark:text-cyan-300 font-mono">
            {formatINR(approvedUnpaidAmount)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Ready for Bank / UPI transfer
          </div>
        </div>

        {/* 5. Processing Payments */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Processing
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <SendHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            {formatINR(0)}
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Gateway dispatch in flight
          </div>
        </div>

        {/* 6. Successfully Paid Amount */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatINR(paidAmount)}
          </div>
          <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            Bank / UPI confirmed
          </div>
        </div>

        {/* 7. Failed Payments */}
        <div className="glass-panel p-3.5 rounded-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Failed
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl xl:text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            0
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Zero transfer failures
          </div>
        </div>
      </div>

      {/* Automation Workflow Stepper */}
      <IncentiveWorkflowStepper
        settled={isSettled}
        eligibleCount={eligibleCount}
        totalIncentive={totalIncentiveEarned}
        approvedCount={approvedUnpaidAmount > 0 ? 1 : 0}
        paidCount={paidAmount > 0 ? 1 : 0}
        workDate={selectedDate}
      />

      {/* Main Grid: Performance Table (Left/Top) + Status & Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section A: Daily Incentive Performance Table (Spans 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Daily Incentive Performance
                {isSettled ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    Finalized Settlement
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    Provisional (Live QA)
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Target points vs achieved points, qualified leads, and tiered incentive breakdown
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search agent..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Agents</option>
                <option value="eligible">Eligible (≥100%)</option>
                <option value="ineligible">Ineligible</option>
              </select>
            </div>
          </div>

          {/* Performance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Agent</th>
                  <th className="py-2.5 px-2 text-center">Target</th>
                  <th className="py-2.5 px-2 text-center text-cyan-600 dark:text-cyan-400">Achieved</th>
                  <th className="py-2.5 px-2 text-center">Completion</th>
                  <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                  <th className="py-2.5 px-2 text-right">Base</th>
                  <th className="py-2.5 px-2 text-right">Slab</th>
                  <th className="py-2.5 px-2.5 text-right text-amber-600 dark:text-amber-400">Total</th>
                  <th className="py-2.5 px-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {paginatedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                      No agent records match the selected filters for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  paginatedAgents.map((a: any) => {
                    const isEligible = a.eligibility_status === "eligible";
                    return (
                      <tr
                        key={a.agent_id}
                        className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {a.agent_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: #{a.agent_id} {a.department ? `• ${a.department}` : ""}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-600 dark:text-slate-300">
                          {formatPoints(a.target_points)}
                        </td>
                        <td className="py-2.5 px-2 text-center font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                          {formatPoints(a.achieved_points)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold font-mono text-[11px]">
                              {formatPercentage(a.completion_pct)}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  a.completion_pct >= 100
                                    ? "bg-emerald-500"
                                    : a.completion_pct >= 50
                                    ? "bg-amber-500"
                                    : "bg-slate-400 dark:bg-slate-600"
                                }`}
                                style={{ width: `${Math.min(100, a.completion_pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {a.qualified_leads_count}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                          {formatINR(a.base_incentive)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                          {formatINR(a.slab_incentive)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                          {formatINR(a.total_incentive)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEligibilityBadgeClass(
                              a.eligibility_status
                            )}`}
                            title={a.eligibility_reason}
                          >
                            {isEligible ? "ELIGIBLE" : "BELOW TARGET"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Showing {paginatedAgents.length} of {filteredAgents.length} agents
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-bold font-mono text-[11px]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Section B & C: Settlement Status & Payment Summary (Spans 1 col) */}
        <div className="flex flex-col gap-6">
          {/* Section B: Settlement Status */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                Settlement Status
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isSettled
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                {isSettled ? "FINALIZED" : "PENDING CUTOFF"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Work Date</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedDate}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Total Agents Audited</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{totalAgents}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Eligible (≥100% Target)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{eligibleCount}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400">Total Settlement Amount</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatINR(totalIncentiveEarned)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Automated Cutoff Cron</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[11px] font-bold">01:00 AM (Next Day)</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/admin/incentives/settlements"
                className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Manage Daily Settlement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Section C: Payment Summary */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Payment Summary
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Disbursements</span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Awaiting Approval
                </span>
                <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{formatINR(pendingApprovalAmount)}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> Approved for Payment
                </span>
                <span className="font-bold font-mono text-cyan-600 dark:text-cyan-400">{formatINR(approvedUnpaidAmount)}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Successfully Paid
                </span>
                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatINR(paidAmount)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Link
                href="/admin/incentives/approvals"
                className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold text-center transition-colors"
              >
                Approvals
              </Link>
              <Link
                href="/admin/incentives/disbursements"
                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold text-center transition-colors"
              >
                Disbursements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
