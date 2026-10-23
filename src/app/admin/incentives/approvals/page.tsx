"use client";

import React, { useState, useMemo } from "react";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useDailyIncentives } from "@/hooks/useDailyIncentives";
import { useIncentiveMutations } from "@/hooks/useIncentiveMutations";
import {
  formatINR,
  formatPoints,
  getApprovalBadgeClass,
  getPaymentBadgeClass,
} from "@/lib/incentives/formatters";
import { SettledAgentItem } from "@/lib/incentives/types";

export default function PayoutApprovalsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    action: "approve" | "reject";
    payouts: SettledAgentItem[];
  } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isLoading, isFetching, refetch } = useDailyIncentives({
    date: selectedDate,
    approval_status: approvalFilter === "all" ? undefined : approvalFilter,
  });

  const { approveMutation } = useIncentiveMutations();

  const agents = data?.data?.agents || [];

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchSearch =
        a.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.agent_id).includes(searchTerm);
      return matchSearch;
    });
  }, [agents, searchTerm]);

  // Handle toggling single checkbox
  const handleToggleSelect = (payoutId: number) => {
    setSelectedIds((prev) =>
      prev.includes(payoutId) ? prev.filter((id) => id !== payoutId) : [...prev, payoutId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredAgents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgents.map((a) => a.payout_id));
    }
  };

  // Trigger modal for single item
  const openSingleAction = (agent: SettledAgentItem, action: "approve" | "reject") => {
    setRemarks(action === "approve" ? "Verified against daily QA audit report" : "");
    setActionModal({
      open: true,
      action,
      payouts: [agent],
    });
  };

  // Trigger modal for bulk selection
  const openBulkAction = (action: "approve" | "reject") => {
    const selectedPayouts = filteredAgents.filter((a) => selectedIds.includes(a.payout_id));
    if (selectedPayouts.length === 0) return;

    setRemarks(action === "approve" ? "Verified against daily QA audit report" : "");
    setActionModal({
      open: true,
      action,
      payouts: selectedPayouts,
    });
  };

  // Execute approval or rejection
  const handleConfirmAction = async () => {
    if (!actionModal) return;

    if (actionModal.action === "reject" && !remarks.trim()) {
      setToastMessage({ type: "error", text: "A rejection reason is required." });
      return;
    }

    try {
      const ids = actionModal.payouts.map((p) => p.payout_id);
      await approveMutation.mutateAsync({
        payout_ids: ids,
        action: actionModal.action,
        remarks: remarks.trim() || undefined,
      });

      setToastMessage({
        type: "success",
        text: `Successfully ${actionModal.action === "approve" ? "approved" : "rejected"} ${ids.length} payout(s).`,
      });
      setSelectedIds([]);
      setActionModal(null);
      refetch();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute approval action";
      setToastMessage({ type: "error", text: msg });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Manager Payout Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review and sign-off on daily settled agent incentive payouts prior to finance disbursement
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedIds([]);
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border ${
            toastMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Toolbar & Bulk Actions */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search agent name..."
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

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openBulkAction("approve")}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Selected ({selectedIds.length})</span>
              </button>

              <button
                onClick={() => openBulkAction("reject")}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject Selected</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approvals Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredAgents.length > 0 && selectedIds.length === filteredAgents.length}
                    onChange={handleSelectAll}
                    className="cursor-pointer rounded"
                  />
                </th>
                <th className="py-2.5 px-2">Agent</th>
                <th className="py-2.5 px-2 text-center">Work Date</th>
                <th className="py-2.5 px-2 text-center">Target Pts</th>
                <th className="py-2.5 px-2 text-center text-cyan-600">Achieved Pts</th>
                <th className="py-2.5 px-2 text-center text-emerald-600">Qualified</th>
                <th className="py-2.5 px-2 text-right text-amber-600">Incentive</th>
                <th className="py-2.5 px-2 text-center">Approval</th>
                <th className="py-2.5 px-2 text-center">Payment</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-medium">
                    No settled records found for {selectedDate}. If you haven&apos;t settled yet, execute Daily Settlement first.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((a) => {
                  const isChecked = selectedIds.includes(a.payout_id);
                  const isPaid = a.payment_status === "paid";
                  return (
                    <tr
                      key={a.payout_id}
                      className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(a.payout_id)}
                          className="cursor-pointer rounded"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-bold text-slate-900 dark:text-white">{a.agent_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{a.agent_id} {a.department ? `• ${a.department}` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                        {a.work_date}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold">{formatPoints(a.target_points)}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-cyan-600 font-mono">
                        {formatPoints(a.achieved_points)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-600">
                        {a.qualified_leads_count}
                      </td>
                      <td className="py-2.5 px-2 text-right font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {formatINR(a.total_incentive)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getApprovalBadgeClass(
                            a.approval_status
                          )}`}
                        >
                          {a.approval_status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentBadgeClass(
                            a.payment_status
                          )}`}
                        >
                          {a.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isPaid && (
                          <div className="flex items-center justify-end gap-1.5">
                            {a.approval_status !== "approved" && (
                              <button
                                onClick={() => openSingleAction(a, "approve")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {a.approval_status !== "rejected" && (
                              <button
                                onClick={() => openSingleAction(a, "reject")}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                        {isPaid && (
                          <span className="text-[10px] text-emerald-600 font-semibold">Protected (Paid)</span>
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

      {/* Confirmation & Remarks Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#000000] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck
                className={`w-6 h-6 flex-shrink-0 ${
                  actionModal.action === "approve" ? "text-emerald-600" : "text-rose-600"
                }`}
              />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {actionModal.action === "approve" ? "Confirm Manager Approval" : "Confirm Payout Rejection"}
              </h3>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are about to {actionModal.action}{" "}
              <span className="font-bold">{actionModal.payouts.length} payout record(s)</span> totaling{" "}
              <span className="font-bold text-amber-600">
                {formatINR(actionModal.payouts.reduce((acc, p) => acc + p.total_incentive, 0))}
              </span>
              .
            </div>

            {/* List of affected agents */}
            <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs flex flex-col gap-1.5">
              {actionModal.payouts.map((p) => (
                <div key={p.payout_id} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{p.agent_name}</span>
                  <span className="font-mono text-amber-600">{formatINR(p.total_incentive)}</span>
                </div>
              ))}
            </div>

            {/* Remarks Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Manager Remarks / Audit Note {actionModal.action === "reject" ? "(Required)" : "(Optional)"}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  actionModal.action === "approve"
                    ? "e.g., Verified against daily QA audit report"
                    : "e.g., Target calculation disputed; QA investigation in progress"
                }
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={approveMutation.isPending}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all cursor-pointer ${
                  actionModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {approveMutation.isPending ? "Saving..." : "Confirm & Sign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
