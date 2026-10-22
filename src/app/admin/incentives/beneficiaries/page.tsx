"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Building,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Search,
  Users,
  Info,
} from "lucide-react";
import { useIncentivePreview } from "@/hooks/useIncentivePreview";
import { useBeneficiary } from "@/hooks/useIncentiveHistory";
import { useIncentiveMutations } from "@/hooks/useIncentiveMutations";
import { PaymentMethod } from "@/lib/incentives/types";

export default function BeneficiaryManagementPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<number>(14);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");

  // Form fields
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch agents list from preview
  const { data: previewData } = useIncentivePreview();
  const agents = previewData?.data?.agents || [];

  // Fetch existing beneficiary data for selected agent
  const { data: benData, isLoading: isLoadingBen, refetch: refetchBen } = useBeneficiary(selectedAgentId);
  const beneficiary = benData?.data;

  const { saveBeneficiaryMutation } = useIncentiveMutations();

  // Selected agent details
  const currentAgent = agents.find((a) => a.agent_id === selectedAgentId);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (paymentMethod === "bank_transfer") {
      if (!accountNumber || accountNumber.length < 6) {
        setToastMessage({ type: "error", text: "Please enter a valid bank account number." });
        return;
      }
      if (!ifscCode || ifscCode.length < 4) {
        setToastMessage({ type: "error", text: "Please enter a valid bank IFSC code." });
        return;
      }
    } else {
      if (!upiId || !upiId.includes("@")) {
        setToastMessage({ type: "error", text: "Please enter a valid UPI Virtual Payment Address (e.g., user@bank)." });
        return;
      }
    }

    try {
      await saveBeneficiaryMutation.mutateAsync({
        agent_id: selectedAgentId,
        payment_method: paymentMethod,
        account_holder_name: accountHolderName || undefined,
        bank_name: bankName || undefined,
        account_number: accountNumber || undefined,
        ifsc_code: ifscCode || undefined,
        upi_id: upiId || undefined,
      });

      setToastMessage({ type: "success", text: "Beneficiary details saved and verified successfully!" });
      setAccountNumber("");
      setUpiId("");
      refetchBen();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save beneficiary";
      setToastMessage({ type: "error", text: msg });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn max-w-[1400px] mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Beneficiary Bank &amp; UPI Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure verified payout destinations for operations agents. Encrypted and masked at rest.
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Agent Selector & Current Configuration */}
        <div className="flex flex-col gap-5">
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Select Operations Agent
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {agents.length === 0 ? (
                <option value={14}>Agent #14 (Default)</option>
              ) : (
                agents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.agent_name} (#{a.agent_id}) — {a.role}
                  </option>
                ))
              )}
            </select>

            {currentAgent && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs flex flex-col gap-1.5 border border-slate-200/60 dark:border-white/5">
                <div className="font-bold text-slate-900 dark:text-white">{currentAgent.agent_name}</div>
                <div className="text-[11px] text-slate-500">Attendance: {currentAgent.attendance_status}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Today&apos;s Target: {currentAgent.target_points} pts | Achieved: {currentAgent.achieved_points} pts
                </div>
              </div>
            )}
          </div>

          {/* Current Saved Beneficiary Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Active Verified Payout Channels
            </h3>

            {isLoadingBen ? (
              <div className="text-xs text-slate-400 py-3">Loading active channels...</div>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                {/* Bank Transfer Status */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-cyan-500" /> Direct Bank Transfer
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        beneficiary?.bank_transfer ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {beneficiary?.bank_transfer ? "CONFIGURED" : "NOT SET"}
                    </span>
                  </div>
                  {beneficiary?.bank_transfer ? (
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      <div>Account: {beneficiary.bank_transfer.masked_account}</div>
                      <div>IFSC: {beneficiary.bank_transfer.ifsc}</div>
                      {beneficiary.bank_transfer.bank_name && <div>Bank: {beneficiary.bank_transfer.bank_name}</div>}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No bank account mapped yet.</span>
                  )}
                </div>

                {/* UPI Status */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> UPI VPA
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        beneficiary?.upi ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {beneficiary?.upi ? "CONFIGURED" : "NOT SET"}
                    </span>
                  </div>
                  {beneficiary?.upi ? (
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      UPI ID: {beneficiary.upi.masked_upi}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No UPI VPA mapped yet.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Update Beneficiary Form (Spans 2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Configure Payout Destination
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Save or update verified banking or UPI credentials for Agent #{selectedAgentId}
              </p>
            </div>

            {/* Method Toggle Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod("bank_transfer")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  paymentMethod === "bank_transfer"
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Bank Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  paymentMethod === "upi"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>UPI VPA</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {paymentMethod === "bank_transfer" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="e.g., Rahul Sharma"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., HDFC Bank, ICICI Bank"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Bank Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter full account number"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g., HDFC0001234"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono uppercase"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5 max-w-md">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    UPI Virtual Payment Address (VPA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                    placeholder="e.g., rahulsharma@okaxis or agent@upi"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono lowercase"
                  />
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 flex items-start gap-2 mt-2">
              <Info className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
              <span>
                Account credentials are submitted directly through secure Next.js server Route Handlers to DemandFlow CRM. Sensitive numbers are masked immediately after verification.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saveBeneficiaryMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveBeneficiaryMutation.isPending ? "Verifying & Saving..." : "Save Beneficiary"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
