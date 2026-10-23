"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UserCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Target,
  Shield,
  Layers,
} from "lucide-react";

export default function PolicyAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [crmCampaigns, setCrmCampaigns] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [scopeType, setScopeType] = useState<"global" | "campaign" | "team" | "agent">("global");
  const [scopeCrmId, setScopeCrmId] = useState("");
  const [priority, setPriority] = useState(10);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, policiesRes, campaignsRes] = await Promise.all([
        fetch("/api/incentive-config/assignments"),
        fetch("/api/incentive-config/policies"),
        fetch("/api/campaign-targets?status=Live"),
      ]);

      const assignJson = await assignRes.json();
      const policiesJson = await policiesRes.json();
      const campaignsJson = await campaignsRes.json();

      if (assignJson.success) setAssignments(assignJson.data);
      if (policiesJson.success) {
        // filter policies that are approved, active, or awaiting_crm_integration
        setPolicies(policiesJson.data);
        if (policiesJson.data.length > 0 && !selectedPolicyId) {
          setSelectedPolicyId(policiesJson.data[0].id.toString());
        }
      }

      if (campaignsJson.success && campaignsJson.data?.targets) {
        setCrmCampaigns(campaignsJson.data.targets);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (!selectedPolicyId) {
        throw new Error("Please select an approved incentive policy.");
      }

      const payload = {
        policyId: selectedPolicyId,
        scopeType,
        scopeCrmId: scopeType === "global" ? null : scopeCrmId ? Number(scopeCrmId) : null,
        priority: Number(priority),
        validFrom,
        validTo: validTo ? validTo : null,
      };

      const res = await fetch("/api/incentive-config/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to assign policy");
      }

      setSuccessMsg("Policy assigned successfully.");
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error assigning policy");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this policy assignment?")) return;
    try {
      const res = await fetch(`/api/incentive-config/assignments?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Assignment removed successfully.");
        fetchData();
      } else {
        setErrorMsg(json.error || "Failed to remove assignment");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error deleting assignment");
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
            Policy Scope Assignments
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Assign policies globally or specifically to live campaigns and teams with automated conflict detection.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Assignment Form */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            New Policy Assignment
          </h2>

          <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Policy
              </label>
              <select
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.policyCode} (v{p.version}) - {p.policyName} [{p.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assignment Scope
              </label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="global">Global (All Campaigns & Agents)</option>
                <option value="campaign">Specific Campaign (CRM Campaign ID)</option>
                <option value="team">Team Scope</option>
                <option value="agent">Individual Agent</option>
              </select>
            </div>

            {scopeType === "campaign" && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Live CRM Campaign
                </label>
                <select
                  value={scopeCrmId}
                  onChange={(e) => setScopeCrmId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select a live CRM campaign...</option>
                  {crmCampaigns.map((c: any) => (
                    <option key={c.campaign_id} value={c.campaign_id}>
                      {c.campaign_name} (CRM ID: {c.campaign_id}) - Quota: {c.allocated_target || c.daily_target}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Authoritative campaigns fetched directly from DemandFlow CRM API
                </span>
              </div>
            )}

            {(scopeType === "team" || scopeType === "agent") && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CRM {scopeType === "team" ? "Team" : "Agent"} ID
                </label>
                <input
                  type="number"
                  required
                  value={scopeCrmId}
                  onChange={(e) => setScopeCrmId(e.target.value)}
                  placeholder="e.g. 104"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valid From</label>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Valid To</label>
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority Order</label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Higher priority numbers override general assignments</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {submitting ? "Assigning..." : "Assign Policy"}
            </button>
          </form>
        </div>

        {/* Existing Assignments Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-500" />
                Active Scope Assignments ({assignments.length})
              </span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Scope</th>
                    <th className="py-2.5 px-3">CRM Ref</th>
                    <th className="py-2.5 px-3">Policy & Version</th>
                    <th className="py-2.5 px-3">Effective Dates</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No policy assignments configured.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-bold uppercase text-slate-700 dark:text-slate-300">
                          {a.scopeType}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {a.scopeCrmId ? `CRM #${a.scopeCrmId}` : "Global"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {a.policy?.policyName || "Policy"}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            {a.policy?.policyCode} (v{a.policy?.version})
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500">
                          {new Date(a.validFrom).toLocaleDateString()} –{" "}
                          {a.validTo ? new Date(a.validTo).toLocaleDateString() : "Indefinite"}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {a.priority}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDelete(a.id.toString())}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
