"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Info,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FileCheck2,
  TrendingUp,
  Percent,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { useIncentivePreview } from "@/hooks/useIncentivePreview";
import { PreviewAgentItem } from "@/lib/incentives/types";
import {
  formatINR,
  formatPoints,
  formatPercentage,
  getEligibilityBadgeClass,
} from "@/lib/incentives/formatters";

export default function DailyIncentiveAuditPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [selectedAgent, setSelectedAgent] = useState<PreviewAgentItem | null>(null);

  const { data, isLoading, isFetching, refetch, error } = useIncentivePreview(selectedDate);

  const previewData = data?.data;
  const agents = previewData?.agents || [];

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      const matchesSearch =
        a.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.agent_id).includes(searchTerm);
      const matchesStatus =
        statusFilter === "all" ? true : a.eligibility_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchTerm, statusFilter]);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Daily Incentive Audit & Preview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time QA lead audit calculations, target achievement thresholds, and compliance checks
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
            title="Refresh preview"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Provisional Data Indicator Alert */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Provisional QA Calculation Notice: </span>
          These are provisional incentives calculated from real-time QA audit scorecards. Final amounts may change as pending audits complete until the official daily settlement cutoff at 01:00 AM.
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Audited</span>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {previewData?.total_agents ?? 0}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Eligible (≥100%)</span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {previewData?.eligible_agents ?? 0}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Below Target (&lt;100%)</span>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-500 dark:text-slate-400">
            {(previewData?.total_agents ?? 0) - (previewData?.eligible_agents ?? 0)}
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Provisional Amount</span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(previewData?.total_incentive ?? 0)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All ({agents.length})
          </button>
          <button
            onClick={() => setStatusFilter("eligible")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "eligible"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Eligible Only ({agents.filter((a) => a.eligibility_status === "eligible").length})
          </button>
          <button
            onClick={() => setStatusFilter("ineligible")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "ineligible"
                ? "bg-slate-700 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Ineligible
          </button>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-2 text-center">Attendance</th>
                <th className="py-2.5 px-2 text-center">Target Pts</th>
                <th className="py-2.5 px-2 text-center text-cyan-600 dark:text-cyan-400">Achieved Pts</th>
                <th className="py-2.5 px-2 text-center">Completion</th>
                <th className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                <th className="py-2.5 px-2 text-center text-rose-600 dark:text-rose-400">Disqual</th>
                <th className="py-2.5 px-2 text-right">Base</th>
                <th className="py-2.5 px-2 text-right">Slab</th>
                <th className="py-2.5 px-2.5 text-right text-amber-600 dark:text-amber-400">Total</th>
                <th className="py-2.5 px-2.5 text-center">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-medium">
                    No agents found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((a) => {
                  const isEligible = a.eligibility_status === "eligible";
                  return (
                    <tr
                      key={a.agent_id}
                      onClick={() => setSelectedAgent(a)}
                      className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      title="Click to view detailed QA scorecard and calculation breakdown"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {a.agent_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: #{a.agent_id} • {a.role}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            a.is_present
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                          }`}
                        >
                          {a.attendance_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                        {formatPoints(a.target_points)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                        {formatPoints(a.achieved_points)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold font-mono text-[11px]">
                            {formatPercentage(a.completion_pct)}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                a.completion_pct >= 100
                                  ? "bg-emerald-500"
                                  : a.completion_pct >= 50
                                  ? "bg-amber-500"
                                  : "bg-slate-400 dark:bg-slate-600"
                              }`}
                              style={{ width: `${Math.min(100, a.completion_pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {a.qualified_leads_count}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-rose-600 dark:text-rose-400 font-mono">
                        {a.disqualified_leads_count}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {formatINR(a.base_incentive)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {formatINR(a.slab_incentive)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {formatINR(a.total_incentive)}
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getEligibilityBadgeClass(
                            a.eligibility_status
                          )}`}
                        >
                          {isEligible ? "ELIGIBLE" : "INELIGIBLE"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Detail Drawer */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#000000] h-full shadow-2xl p-6 overflow-y-auto flex flex-col gap-5 border-l border-slate-200 dark:border-white/10 animate-slideInRight">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedAgent.agent_name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Agent ID: #{selectedAgent.agent_id} • {selectedAgent.role}
                </p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Eligibility Banner */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                selectedAgent.eligibility_status === "eligible"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              {selectedAgent.eligibility_status === "eligible" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <div className="font-bold uppercase tracking-wider text-[10px]">
                  {selectedAgent.eligibility_status === "eligible" ? "Target Achieved" : "Ineligible for Payout"}
                </div>
                <p className="text-[11px] mt-0.5">{selectedAgent.eligibility_reason}</p>
              </div>
            </div>

            {/* Incentive Formula Breakdown */}
            <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                Incentive Calculation Formula
              </span>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Base Incentive (100% threshold)</span>
                <span className="font-bold font-mono">{formatINR(selectedAgent.base_incentive)}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Tiered Slab Incentive (Excess Points)</span>
                <span className="font-bold font-mono">{formatINR(selectedAgent.slab_incentive)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">Total Calculated Incentive</span>
                <span className="font-extrabold font-mono text-amber-600 dark:text-amber-400 text-sm">
                  {formatINR(selectedAgent.total_incentive)}
                </span>
              </div>
            </div>

            {/* Points & Lead Scoring */}
            <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                QA Audit Lead Scorecard
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 uppercase">Target Points</span>
                  <div className="text-base font-bold font-mono">{formatPoints(selectedAgent.target_points)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 uppercase">Achieved Points</span>
                  <div className="text-base font-bold font-mono text-cyan-600">{formatPoints(selectedAgent.achieved_points)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 uppercase">Qualified Leads</span>
                  <div className="text-base font-bold font-mono text-emerald-600">{selectedAgent.qualified_leads_count}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-[10px] text-slate-400 uppercase">Disqualified Leads</span>
                  <div className="text-base font-bold font-mono text-rose-600">{selectedAgent.disqualified_leads_count}</div>
                </div>
              </div>
            </div>

            {/* Compliance & Attendance Checks */}
            <div className="glass-panel p-4 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col gap-2.5 text-xs">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                Compliance & Attendance
              </span>
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">Attendance Status</span>
                <span className="font-semibold">{selectedAgent.attendance_status}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Active QA Escalation</span>
                <span className={`font-semibold ${selectedAgent.has_escalation ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedAgent.has_escalation ? "Yes (Blocked)" : "None"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
