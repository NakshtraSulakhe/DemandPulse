"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  FileCheck2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Database,
  RefreshCw,
  Layers,
  Send,
  Shield,
  Activity,
  History,
} from "lucide-react";

interface PolicyStats {
  total: number;
  active: number;
  draft: number;
  pending_approval: number;
  awaiting_crm_integration: number;
}

export default function IncentiveConfigDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PolicyStats>({
    total: 0,
    active: 0,
    draft: 0,
    pending_approval: 0,
    awaiting_crm_integration: 0,
  });
  const [recentPolicies, setRecentPolicies] = useState<any[]>([]);
  const [recentAudit, setRecentAudit] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [policiesRes, auditRes] = await Promise.all([
        fetch("/api/incentive-config/policies"),
        fetch("/api/incentive-config/history?limit=6"),
      ]);

      const policiesJson = await policiesRes.json();
      const auditJson = await auditRes.json();

      if (policiesJson.success && Array.isArray(policiesJson.data)) {
        const policies = policiesJson.data;
        const counts: PolicyStats = {
          total: policies.length,
          active: policies.filter((p: any) => p.status === "active").length,
          draft: policies.filter((p: any) => p.status === "draft").length,
          pending_approval: policies.filter((p: any) => p.status === "pending_approval").length,
          awaiting_crm_integration: policies.filter((p: any) => p.status === "awaiting_crm_integration").length,
        };
        setStats(counts);
        setRecentPolicies(policies.slice(0, 5));
      }

      if (auditJson.success && Array.isArray(auditJson.data)) {
        setRecentAudit(auditJson.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              demandflow_slides DB
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Policy Management & Audit Architecture</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Incentive Configuration Console
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Design multi-slab incentive tiers, manage approval workflows, enforce versioning safeguards, and sync rules with DemandFlow Bridge CRM.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/incentive-config/policies/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            New Policy Draft
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Policies</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Across all version branches</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Policies</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.active}</div>
          <div className="text-[10px] text-slate-400 mt-1">Confirmed active in CRM</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="text-[11px] font-bold uppercase tracking-wider">Draft Policies</span>
            <FileCheck2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.draft}</div>
          <div className="text-[10px] text-slate-400 mt-1">Under editing/review</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approval</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-2">{stats.pending_approval}</div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting manager sign-off</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting CRM Pub</span>
            <Send className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{stats.awaiting_crm_integration}</div>
          <div className="text-[10px] text-slate-400 mt-1">Approved, awaiting CRM sync</div>
        </div>
      </div>

      {/* Main Grid: Policies Overview & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Policies */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              Configured Incentive Policies
            </h2>
            <Link
              href="/admin/incentive-config/policies"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View All Policies <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-3 px-4">Policy Code & Name</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Threshold & Base</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentPolicies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {loading ? "Loading policies..." : "No policies configured yet."}
                      </td>
                    </tr>
                  ) : (
                    recentPolicies.map((p) => {
                      const statusColor =
                        p.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : p.status === "pending_approval"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : p.status === "awaiting_crm_integration"
                          ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                          : "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/40";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{p.policyName}</div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{p.policyCode}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              v{p.version}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800 dark:text-slate-200">
                              {p.rules?.minimumTargetPct ? `${Number(p.rules.minimumTargetPct)}% Target` : "100%"}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Base: ₹{p.rules?.baseIncentiveAmount ? Number(p.rules.baseIncentiveAmount).toLocaleString("en-IN") : "500"}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusColor}`}>
                              {p.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/admin/incentive-config/policies/${p.id}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors"
                            >
                              Configure
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Architecture Guardrail Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 text-xs flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-900 dark:text-blue-300">Authoritative CRM Source of Truth Guarantee</div>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                The Slides database (<code className="font-mono text-cyan-400">demandflow_slides</code>) stores policy drafts, slab schemas, version trees, and display sessions.
                The DemandFlow Bridge CRM PHP calculation engine remains the authoritative source for actual lead audits, points calculation, settlements, and bank disbursements.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Modules & Audit Stream */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            Quick Navigation
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <Link
              href="/admin/incentive-config/assignments"
              className="p-3.5 rounded-xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-between group shadow-sm"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  Policy Assignments
                </div>
                <div className="text-[10px] text-slate-500">Map policies to campaigns, teams, or agents</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/admin/incentive-config/approvals"
              className="p-3.5 rounded-xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 transition-all flex items-center justify-between group shadow-sm"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Manager Approvals ({stats.pending_approval})
                </div>
                <div className="text-[10px] text-slate-500">Review pending policies before publication</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/admin/incentive-config/history"
              className="p-3.5 rounded-xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-between group shadow-sm"
            >
              <div>
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                  Configuration History
                </div>
                <div className="text-[10px] text-slate-500">Immutable audit logs and version timelines</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Recent Audit Log Feed */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Recent Configuration Actions
            </h3>
            <div className="p-3 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2.5">
              {recentAudit.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-2 text-center">No recent activity recorded.</div>
              ) : (
                recentAudit.map((log) => (
                  <div key={log.id} className="text-[11px] pb-2 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {log.resourceType}: {log.resourceId || "global"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
