"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  X,
  CreditCard,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useIncentiveHistory, usePayoutStatus } from "@/hooks/useIncentiveHistory";
import {
  formatINR,
  getApprovalBadgeClass,
  getPaymentBadgeClass,
} from "@/lib/incentives/formatters";
import { SettledAgentItem } from "@/lib/incentives/types";

export default function IncentiveHistoryPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedPayoutId, setSelectedPayoutId] = useState<number | null>(null);

  const { data, isFetching, refetch } = useIncentiveHistory({
    from: fromDate,
    to: toDate,
    approval_status: approvalFilter === "all" ? undefined : approvalFilter,
    payment_status: paymentFilter === "all" ? undefined : paymentFilter,
    limit: 100,
  });

  // Query audit trail and lifecycle details for selected payout
  const { data: statusData, isLoading: isLoadingStatus } = usePayoutStatus(selectedPayoutId);

  const historyData = data?.data;
  const records = historyData?.records || [];

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.payout_id).includes(searchTerm) ||
        String(r.agent_id).includes(searchTerm);
      return matchSearch;
    });
  }, [records, searchTerm]);

  const auditDetails = statusData?.data;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Payment Transaction History &amp; Audit Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical settlement records, payment dispatch logs, and lifecycle audit trail
          </p>
        </div>

        {/* Date Range Selector & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
            <span className="text-[10px] text-slate-400 font-bold uppercase">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Settled Records</span>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {historyData?.summary?.total_records || records.length}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Incentive Settled</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(historyData?.summary?.total_incentive || 0)}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Paid / Disbursed</span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(historyData?.summary?.paid_total || 0)}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Approved Unpaid</span>
          <div className="mt-1 text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
            {formatINR(historyData?.summary?.approved_unpaid_total || 0)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by agent name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">All Approval States</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">All Payment States</option>
            <option value="unpaid">Unpaid</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2.5 px-3">Payout ID</th>
                <th className="py-2.5 px-2">Agent</th>
                <th className="py-2.5 px-2 text-center">Work Date</th>
                <th className="py-2.5 px-2 text-right text-amber-600">Incentive</th>
                <th className="py-2.5 px-2 text-center">Approval</th>
                <th className="py-2.5 px-2 text-center">Method</th>
                <th className="py-2.5 px-2 text-center">Payment Status</th>
                <th className="py-2.5 px-2">Provider Ref</th>
                <th className="py-2.5 px-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    No transaction records found for the range {fromDate} to {toDate}.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.payout_id}
                    onClick={() => setSelectedPayoutId(r.payout_id)}
                    className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      #{r.payout_id}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {r.agent_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Agent #{r.agent_id} {r.department ? `• ${r.department}` : ""}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-slate-500">{r.work_date}</td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                      {formatINR(r.total_incentive)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getApprovalBadgeClass(
                          r.approval_status
                        )}`}
                      >
                        {r.approval_status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] uppercase text-slate-600 dark:text-slate-400">
                      {r.payment_method || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentBadgeClass(
                          r.payment_status
                        )}`}
                      >
                        {r.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                      {r.payment_reference || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayoutId(r.payout_id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                        title="View complete audit timeline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Timeline Drawer */}
      {selectedPayoutId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-[#0c1220] h-full shadow-2xl p-6 overflow-y-auto flex flex-col gap-5 border-l border-slate-200 dark:border-white/10 animate-slideInRight">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-500" />
                  Payout Audit Trail #{selectedPayoutId}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Complete lifecycle history &amp; monotonic event logs
                </p>
              </div>
              <button
                onClick={() => setSelectedPayoutId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingStatus ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading audit trail...</div>
            ) : auditDetails ? (
              <div className="flex flex-col gap-5 text-xs">
                {/* Agent & Amount Snapshot */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {auditDetails.payout.agent_name}
                    </span>
                    <span className="font-mono text-amber-600 font-extrabold text-sm">
                      {formatINR(auditDetails.payout.total_incentive)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Work Date: {auditDetails.payout.work_date}</span>
                    <span>Status: {auditDetails.payout.payment_status.toUpperCase()}</span>
                  </div>
                </div>

                {/* Approvals Section */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-500" /> Manager Approvals &amp; Actions
                  </h4>
                  {auditDetails.approvals.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-400 italic">
                      Awaiting manager sign-off.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {auditDetails.approvals.map((appr) => (
                        <div
                          key={appr.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {appr.manager_name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                appr.action === "approve"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-rose-500/15 text-rose-600"
                              }`}
                            >
                              {appr.action}d
                            </span>
                          </div>
                          {appr.reason && (
                            <p className="text-[11px] text-slate-500 mt-0.5">&ldquo;{appr.reason}&rdquo;</p>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">{appr.created_at}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payment Attempts Section */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Gateway Payment Attempts
                  </h4>
                  {auditDetails.attempts.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-400 italic">
                      No payment transfers initiated yet.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {auditDetails.attempts.map((att, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Attempt #{att.attempt_number} — {att.provider}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                att.status === "success"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : att.status === "pending"
                                  ? "bg-cyan-500/15 text-cyan-600"
                                  : "bg-rose-500/15 text-rose-600"
                              }`}
                            >
                              {att.status}
                            </span>
                          </div>
                          {att.provider_reference && (
                            <div className="font-mono text-[10px] text-slate-500">
                              Ref: {att.provider_reference}
                            </div>
                          )}
                          {att.failure_reason && (
                            <div className="text-[10px] text-rose-600 font-semibold">
                              Error: {att.failure_reason}
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">{att.initiated_at}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Events Timeline */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" /> Monotonic Event Timeline
                  </h4>
                  <div className="flex flex-col gap-2 border-l-2 border-slate-200 dark:border-slate-800 pl-3 ml-1.5">
                    {auditDetails.events.map((ev, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                          {ev.event_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{ev.created_at}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
