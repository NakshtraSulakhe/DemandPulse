"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  ArrowRight,
  Layers,
  RefreshCw,
  GitBranch,
} from "lucide-react";

export default function PoliciesListPage() {
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/incentive-config/policies", window.location.origin);
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter);
      if (searchTerm) url.searchParams.set("search", searchTerm);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPolicies(json.data);
      }
    } catch (err) {
      console.error("Failed to load policies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPolicies();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/incentive-config"
              className="text-xs text-slate-500 hover:text-emerald-500 transition-colors"
            >
              Incentive Config
            </Link>
            <span className="text-slate-400 text-xs">/</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Policies</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Incentive Policies Directory
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Configure multi-tiered production rules, base amounts, QA penalties, and view version lineages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPolicies}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#0c1322] p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Policies" },
            { id: "active", label: "Active" },
            { id: "draft", label: "Drafts" },
            { id: "pending_approval", label: "Pending Approval" },
            { id: "awaiting_crm_integration", label: "Awaiting CRM" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-72">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            Loading incentive policies...
          </div>
        ) : policies.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs">
            No policies matching the selected filter criteria.
          </div>
        ) : (
          policies.map((p) => {
            const statusBadge =
              p.status === "active"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : p.status === "pending_approval"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : p.status === "awaiting_crm_integration"
                ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
                : "bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/40";

            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                      {p.policyCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        v{p.version}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusBadge}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2 group-hover:text-emerald-500 transition-colors">
                    {p.policyName}
                  </h3>

                  {/* Financial Rule Overview */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Min. Target:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {p.rules?.minimumTargetPct ? `${Number(p.rules.minimumTargetPct)}%` : "100%"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Base Daily Amount:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{p.rules?.baseIncentiveAmount ? Number(p.rules.baseIncentiveAmount).toLocaleString("en-IN") : "500"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tiered Slabs:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {p.slabs?.length || 0} Tier{p.slabs?.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">QA Escalation:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 capitalize">
                        {p.rules?.qaEscalationAction || "disqualify"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Valid From: {p.validFrom ? new Date(p.validFrom).toLocaleDateString() : "Indefinite"}
                  </span>
                  <Link
                    href={`/admin/incentive-config/policies/${p.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Configure Policy <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
