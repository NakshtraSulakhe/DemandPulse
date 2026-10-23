"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  SendHorizontal,
  CreditCard,
  Building,
  Smartphone,
  Calendar,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useDailyIncentives } from "@/hooks/useDailyIncentives";
import { useIncentiveMutations } from "@/hooks/useIncentiveMutations";
import {
  formatINR,
  getApprovalBadgeClass,
  getPaymentBadgeClass,
} from "@/lib/incentives/formatters";
import { PaymentMethod, SettledAgentItem } from "@/lib/incentives/types";

export default function PaymentDisbursementPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<number, PaymentMethod>>({});
  const [disburseConfirm, setDisburseConfirm] = useState<{
    payout: SettledAgentItem;
    method: PaymentMethod;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, isFetching, refetch } = useDailyIncentives({
    date: selectedDate,
    payment_status: paymentStatusFilter === "all" ? undefined : paymentStatusFilter,
  });

  const { disburseMutation } = useIncentiveMutations();

  const allAgents = data?.data?.agents || [];

  // Filter to approved payouts primarily, or allow viewing all payment states
  const filteredPayouts = useMemo(() => {
    return allAgents.filter((a) => {
      const matchSearch =
        a.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.agent_id).includes(searchTerm);
      return matchSearch;
    });
  }, [allAgents, searchTerm]);

  const handleSelectMethod = (payoutId: number, method: PaymentMethod) => {
    setSelectedPaymentMethods((prev) => ({
      ...prev,
      [payoutId]: method,
    }));
  };

  const handleConfirmDisbursement = async () => {
    if (!disburseConfirm) return;
    const { payout, method } = disburseConfirm;

    try {
      const res = await disburseMutation.mutateAsync({
        payout_id: payout.payout_id,
        payment_method: method,
      });

      setToastMessage({
        type: "success",
        text: `Payout dispatch initiated for ${payout.agent_name} (${formatINR(payout.total_incentive)}). Reference: ${
          res.data?.provider_reference || "SIMULATED-REF"
        }`,
      });
      setDisburseConfirm(null);
      refetch();
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Disbursement execution failed";
      setToastMessage({ type: "error", text: msg });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SendHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Payment Disbursement Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dispatch approved incentives via direct Bank Transfer or UPI. Protected with monotonic idempotency.
          </p>
        </div>

        {/* Date Selector & Refresh */}
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
            title="Refresh disbursements"
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

      {/* Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-72 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search agent name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">All Payment States</option>
            <option value="unpaid">Unpaid (Awaiting / Approved)</option>
            <option value="processing">Processing in Gateway</option>
            <option value="paid">Paid & Disbursed</option>
            <option value="failed">Failed Transfers</option>
          </select>

          <Link
            href="/admin/incentives/beneficiaries"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span>Manage Beneficiaries</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Disbursement Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-2 text-center">Work Date</th>
                <th className="py-2.5 px-2 text-right text-amber-600">Amount</th>
                <th className="py-2.5 px-2 text-center">Approval</th>
                <th className="py-2.5 px-2 text-center">Payment Status</th>
                <th className="py-2.5 px-2 text-center">Method</th>
                <th className="py-2.5 px-2">Masked Beneficiary</th>
                <th className="py-2.5 px-2">Transaction Ref</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    No payout records found for {selectedDate}.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((p) => {
                  const isApproved = p.approval_status === "approved";
                  const isPaid = p.payment_status === "paid";
                  const isProcessing = p.payment_status === "processing";
                  const selectedMethod =
                    selectedPaymentMethods[p.payout_id] || p.payment_method || "bank_transfer";
                  const hasBeneficiary = !!p.beneficiary;

                  return (
                    <tr
                      key={p.payout_id}
                      className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{p.agent_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{p.agent_id} • Payout: #{p.payout_id}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-500">
                        {p.work_date}
                      </td>
                      <td className="py-2.5 px-2 text-right font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {formatINR(p.total_incentive)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getApprovalBadgeClass(
                            p.approval_status
                          )}`}
                        >
                          {p.approval_status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPaymentBadgeClass(
                            p.payment_status
                          )}`}
                        >
                          {p.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {!isPaid && !isProcessing ? (
                          <select
                            value={selectedMethod}
                            onChange={(e) =>
                              handleSelectMethod(p.payout_id, e.target.value as PaymentMethod)
                            }
                            disabled={!isApproved}
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 outline-none disabled:opacity-50"
                          >
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="upi">UPI</option>
                          </select>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 uppercase">
                            {p.payment_method}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        {hasBeneficiary ? (
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {p.beneficiary?.masked_account || p.beneficiary?.masked_upi || "Configured"}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Needs setup
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500">
                        {p.payment_reference || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isPaid ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed
                          </span>
                        ) : isProcessing ? (
                          <span className="text-[11px] font-bold text-cyan-600 flex items-center justify-end gap-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" /> In Flight
                          </span>
                        ) : isApproved ? (
                          <button
                            onClick={() =>
                              setDisburseConfirm({
                                payout: p,
                                method: selectedMethod,
                              })
                            }
                            disabled={disburseMutation.isPending}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            Disburse
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Awaiting Approval</span>
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

      {/* Disbursement Confirmation Dialog */}
      {disburseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#000000] rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Authorize Payout Disbursement
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agent Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{disburseConfirm.payout.agent_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Approved Incentive</span>
                <span className="font-bold font-mono text-amber-600 text-sm">
                  {formatINR(disburseConfirm.payout.total_incentive)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-semibold uppercase">{disburseConfirm.method}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Masked Beneficiary</span>
                <span className="font-mono">
                  {disburseConfirm.payout.beneficiary?.masked_account ||
                    disburseConfirm.payout.beneficiary?.masked_upi ||
                    "Auto-resolving profile"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              This request calls DemandFlow CRM disbursement service to dispatch funds. Payout status will immediately update to <code className="text-cyan-500 font-bold">processing</code>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDisburseConfirm(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDisbursement}
                disabled={disburseMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer"
              >
                {disburseMutation.isPending ? "Dispatching..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
