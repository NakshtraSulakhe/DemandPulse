"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  RefreshCw,
  GitBranch,
  Shield,
  Layers,
  Clock,
  Send,
  Database,
} from "lucide-react";

export default function ConfigurationHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [logsRes, policiesRes] = await Promise.all([
        fetch("/api/incentive-config/history?limit=100"),
        fetch("/api/incentive-config/policies"),
      ]);

      const logsJson = await logsRes.json();
      const policiesJson = await policiesRes.json();

      if (logsJson.success) setAuditLogs(logsJson.data);
      if (policiesJson.success) setPolicies(policiesJson.data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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
            Configuration History & Version Timelines
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Immutable audit record of all policy draft creation, version branching, approval actions, and CRM publication states.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Version Catalog */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-500" />
              Policy Version Branches
            </h2>

            <div className="space-y-2.5">
              {policies.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">No policies configured yet.</div>
              ) : (
                policies.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {p.policyCode} (v{p.version})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white truncate">{p.policyName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Base: ₹{p.rules?.baseIncentiveAmount ? Number(p.rules.baseIncentiveAmount) : 500}</span>
                      <span>{p.slabs?.length || 0} Slabs</span>
                      <Link
                        href={`/admin/incentive-config/policies/${p.id}`}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      >
                        Inspect &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Immutable Audit Log Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-500" />
              Database Audit Trail (demandflow_slides.slide_audit_logs)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Details / Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          {log.resourceType}:{log.resourceId || "global"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {log.detailsJson ? JSON.stringify(log.detailsJson) : "—"}
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
