"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Clock,
  Layers,
  FileCheck2,
} from "lucide-react";

export default function PolicyApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [pendingPolicies, setPendingPolicies] = useState<any[]>([]);
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/incentive-config/policies?status=pending_approval");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendingPolicies(json.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load pending policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const remarks = remarksMap[id] || (action === "approve" ? "Approved by operations management." : "Rejected during policy review.");
      const res = await fetch(`/api/incentive-config/policies/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, remarks }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${action} policy`);
      }

      setSuccessMsg(`Policy ${action === "approve" ? "approved" : "rejected"} successfully.`);
      fetchPending();
    } catch (err: any) {
      setErrorMsg(err.message || "Action failed");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/incentive-config"
              className="text-xs text-slate-500 hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Manager Policy Approval Queue
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Review proposed incentive configurations and tiered slabs before they can be assigned or published.
          </p>
        </div>

        <button
          onClick={fetchPending}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-xs">
          Loading approval queue...
        </div>
      ) : pendingPolicies.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no incentive policies awaiting managerial approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingPolicies.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-amber-500/30 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      {p.policyCode}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                      Version {p.version}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Pending Review
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">{p.policyName}</h3>
                </div>

                <Link
                  href={`/admin/incentive-config/policies/${p.id}`}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Inspect Full Policy Definition &rarr;
                </Link>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 block">Min Target %</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {p.rules?.minimumTargetPct ? `${Number(p.rules.minimumTargetPct)}%` : "100%"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Base Incentive</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{p.rules?.baseIncentiveAmount ? Number(p.rules.baseIncentiveAmount).toLocaleString("en-IN") : "500"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Tiers Configured</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {p.slabs?.length || 0} Slab{p.slabs?.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">QA Escalation</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 capitalize">
                    {p.rules?.qaEscalationAction || "disqualify"}
                  </span>
                </div>
              </div>

              {/* Approval Remarks and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Optional review remarks or reason..."
                  value={remarksMap[p.id.toString()] || ""}
                  onChange={(e) => setRemarksMap({ ...remarksMap, [p.id.toString()]: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />

                <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                  <button
                    onClick={() => handleAction(p.id.toString(), "reject")}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(p.id.toString(), "approve")}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Policy
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
