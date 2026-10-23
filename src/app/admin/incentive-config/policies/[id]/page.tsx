"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  ArrowLeft,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  GitBranch,
  RefreshCw,
  FileText,
  UserCheck,
} from "lucide-react";

export default function PolicyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [policy, setPolicy] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<any>(null);

  // Editable Form State
  const [policyName, setPolicyName] = useState("");
  const [minimumTargetPct, setMinimumTargetPct] = useState(100);
  const [baseIncentiveAmount, setBaseIncentiveAmount] = useState(500);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [qaEscalationAction, setQaEscalationAction] = useState("disqualify");
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [maximumDailyIncentive, setMaximumDailyIncentive] = useState(5000);
  const [roundingMode, setRoundingMode] = useState("floor");
  const [slabs, setSlabs] = useState<any[]>([]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incentive-config/policies/${params.id}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Policy not found");
      }

      const p = json.data;
      setPolicy(p);
      setPolicyName(p.policyName);
      if (p.rules) {
        setMinimumTargetPct(Number(p.rules.minimumTargetPct));
        setBaseIncentiveAmount(Number(p.rules.baseIncentiveAmount));
        setAttendanceRequired(p.rules.attendanceRequired);
        setQaEscalationAction(p.rules.qaEscalationAction);
        setPenaltyAmount(Number(p.rules.penaltyAmount));
        setMaximumDailyIncentive(p.rules.maximumDailyIncentive ? Number(p.rules.maximumDailyIncentive) : 5000);
        setRoundingMode(p.rules.roundingMode);
      }
      if (p.slabs) {
        setSlabs(
          p.slabs.map((s: any) => ({
            slabOrder: s.slabOrder,
            minimumCompletionPct: Number(s.minimumCompletionPct),
            maximumCompletionPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
            amountPerExtraPoint: Number(s.amountPerExtraPoint),
          }))
        );
      }

      // Fetch versions
      const vRes = await fetch(`/api/incentive-config/policies/${params.id}/versions`);
      const vJson = await vRes.json();
      if (vJson.success) {
        setVersions(vJson.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch policy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, [params.id]);

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        policyName,
        rules: {
          minimumTargetPct: Number(minimumTargetPct),
          baseIncentiveAmount: Number(baseIncentiveAmount),
          attendanceRequired,
          qaEscalationAction,
          penaltyAmount: Number(penaltyAmount),
          maximumDailyIncentive: maximumDailyIncentive ? Number(maximumDailyIncentive) : null,
          roundingMode,
        },
        slabs: slabs.map((s, idx) => ({
          slabOrder: idx + 1,
          minimumCompletionPct: Number(s.minimumCompletionPct),
          maximumCompletionPct: s.maximumCompletionPct ? Number(s.maximumCompletionPct) : null,
          amountPerExtraPoint: Number(s.amountPerExtraPoint),
        })),
      };

      const res = await fetch(`/api/incentive-config/policies/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update policy");
      }

      setSuccessMsg(json.message);
      if (json.data.isNewVersion) {
        router.push(`/admin/incentive-config/policies/${json.data.id}`);
      } else {
        fetchPolicy();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save policy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/incentive-config/policies/${params.id}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit for approval");
      }

      setSuccessMsg(json.message);
      fetchPolicy();
    } catch (err: any) {
      setErrorMsg(err.message || "Error submitting policy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (action: "approve" | "reject") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/incentive-config/policies/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, remarks: `Reviewed and ${action}d via admin console.` }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${action} policy`);
      }

      setSuccessMsg(json.message);
      fetchPolicy();
    } catch (err: any) {
      setErrorMsg(err.message || `Error during ${action}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishToCrm = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setPublishResult(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/incentive-config/policies/${params.id}/publish`, {
        method: "POST",
      });
      const json = await res.json();

      setPublishResult(json.data);
      if (json.success) {
        setSuccessMsg(json.message);
      } else {
        setErrorMsg(json.message);
      }
      fetchPolicy();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to publish policy to CRM");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
        Loading policy configuration...
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        Policy not found.
      </div>
    );
  }

  const isReadOnly = policy.status === "active" || policy.status === "approved" || policy.status === "awaiting_crm_integration";

  const statusBadge =
    policy.status === "active"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : policy.status === "pending_approval"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
      : policy.status === "awaiting_crm_integration"
      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
      : "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/40";

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/incentive-config/policies"
              className="text-xs text-slate-500 hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Policies
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{policy.policyCode}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {policy.policyName}
            </h1>
            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              v{policy.version}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusBadge}`}>
              {policy.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {policy.status === "draft" && (
            <button
              onClick={handleSubmitForApproval}
              disabled={submitting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all hover:scale-[1.02]"
            >
              <Clock className="w-4 h-4" />
              Submit for Manager Approval
            </button>
          )}

          {policy.status === "pending_approval" && (
            <>
              <button
                onClick={() => handleApprove("reject")}
                disabled={submitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors"
              >
                Reject Policy
              </button>
              <button
                onClick={() => handleApprove("approve")}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Policy
              </button>
            </>
          )}

          {(policy.status === "approved" || policy.status === "awaiting_crm_integration") && (
            <button
              onClick={handlePublishToCrm}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02]"
            >
              <Send className="w-4 h-4" />
              Publish to CRM Engine
            </button>
          )}

          <button
            onClick={handleSaveUpdate}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isReadOnly ? "Fork as New Draft Version" : "Save Changes"}
          </button>
        </div>
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

      {/* CRM Publishing Notice / Contract Box */}
      {policy.status === "awaiting_crm_integration" && (
        <div className="p-4 rounded-2xl bg-cyan-900/15 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-cyan-800 dark:text-cyan-300">
            <Send className="w-4 h-4 text-cyan-500" />
            CRM Integration Publishing Status: Awaiting CRM Upstream Endpoint
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            This policy has been approved locally, but the DemandFlow Bridge CRM PHP calculation engine does not currently have an active configuration publishing endpoint (
            <code className="font-mono text-cyan-400">POST /api/v1/incentives/publish_policy.php</code>).
            In strict compliance with architectural data consistency rules, the policy will not be falsely displayed as active until the CRM accepts the configuration contract.
          </p>
        </div>
      )}

      {/* Main Form & Details */}
      <form onSubmit={handleSaveUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Rules Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Policy Thresholds & Financial Terms
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Name</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min. Target Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minimumTargetPct}
                  onChange={(e) => setMinimumTargetPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base Daily Incentive (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  value={baseIncentiveAmount}
                  onChange={(e) => setBaseIncentiveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-bold text-emerald-600 dark:text-emerald-400 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Daily Incentive Cap (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  value={maximumDailyIncentive}
                  onChange={(e) => setMaximumDailyIncentive(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  QA Audit Escalation Action
                </label>
                <select
                  value={qaEscalationAction}
                  onChange={(e) => setQaEscalationAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="disqualify">Disqualify (Zero Out Day)</option>
                  <option value="zero_out">Zero Out</option>
                  <option value="penalty">Penalty Amount</option>
                  <option value="none">No Action</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rounding Mode</label>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="floor">Floor (Standard)</option>
                  <option value="round">Round</option>
                  <option value="ceil">Ceiling</option>
                </select>
              </div>
            </div>
          </div>

          {/* Slabs Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              Tiered Incentive Slabs
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Min Completion</th>
                    <th className="py-2.5 px-3">Max Completion</th>
                    <th className="py-2.5 px-3">Amount / Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {slabs.map((s) => (
                    <tr key={s.slabOrder}>
                      <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">Tier #{s.slabOrder}</td>
                      <td className="py-2.5 px-3">{s.minimumCompletionPct}%</td>
                      <td className="py-2.5 px-3">{s.maximumCompletionPct !== null ? `${s.maximumCompletionPct}%` : "Open-Ended"}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">₹{s.amountPerExtraPoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Version Lineage & Approval Log */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-emerald-500" />
              Version Lineage ({policy.policyCode})
            </h3>
            <div className="space-y-2">
              {versions.map((v) => (
                <Link
                  key={v.id}
                  href={`/admin/incentive-config/policies/${v.id}`}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                    v.id.toString() === params.id
                      ? "bg-emerald-500/10 border-emerald-500/40 font-bold text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                      v{v.version}
                    </span>
                    <span className="text-[11px] truncate max-w-[130px]">{v.policyName}</span>
                  </div>
                  <span className="text-[10px] capitalize opacity-80">{v.status}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Approvals History */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-500" />
              Approval Reviews
            </h3>
            {policy.approvals?.length === 0 ? (
              <div className="text-[11px] text-slate-400 py-2">No approval reviews recorded for this version.</div>
            ) : (
              <div className="space-y-2">
                {policy.approvals.map((app: any) => (
                  <div key={app.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{app.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(app.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{app.remarks}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
