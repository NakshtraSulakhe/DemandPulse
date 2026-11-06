"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileCheck2,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Award,
  Coins,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Target,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  X,
  Layers,
  Flame,
  Check,
} from "lucide-react";
import { formatINR } from "@/lib/incentives/formatters";
import {
  QaIncentivePlan,
  QaIncentiveCalculationItem,
  TargetFrequency,
  QaAuditLead,
} from "@/types/qa-incentives";

export default function QaIncentiveCalculatorView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [frequency, setFrequency] = useState<TargetFrequency>("DAILY");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<QaIncentivePlan[]>([]);
  const [calculations, setCalculations] = useState<QaIncentiveCalculationItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [apiSource, setApiSource] = useState<string>("upstream-crm-qa-audits-api");
  const [activeTab, setActiveTab] = useState<"audits" | "plans">("audits");
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [activeLeadsModalAnalyst, setActiveLeadsModalAnalyst] = useState<QaIncentiveCalculationItem | null>(null);

  // Load plans & calculation
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, calcRes] = await Promise.all([
        fetch("/api/qa-incentives/plans"),
        fetch(`/api/qa-incentives/calculate?date=${encodeURIComponent(selectedDate)}&frequency=${frequency}`),
      ]);

      const plansJson = await plansRes.json();
      const calcJson = await calcRes.json();

      if (plansJson.success) setPlans(plansJson.data || []);
      if (calcJson.success) {
        setCalculations(calcJson.calculations || []);
        setSummary(calcJson.summary || null);
        if (calcJson.source) setApiSource(calcJson.source);
      }
    } catch (err) {
      console.error("Failed to load QA incentive audit data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, frequency]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle plan active state
  const handleTogglePlan = async (plan: QaIncentivePlan) => {
    try {
      await fetch(`/api/qa-incentives/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      fetchData();
    } catch (e) {
      console.error("Failed to toggle plan status:", e);
    }
  };

  // Delete plan
  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this QA incentive plan?")) return;
    try {
      await fetch(`/api/qa-incentives/plans/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error("Failed to delete plan:", e);
    }
  };

  const filteredCalculations = useMemo(() => {
    return calculations.filter((c) => {
      return (
        c.qa_agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.qa_agent_id).includes(searchTerm)
      );
    });
  }, [calculations, searchTerm]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
              <FileCheck2 className="w-3 h-3" /> QA Lead Audit Incentive Pipeline
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Database & Live Stream Calculation</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            QA Team Incentive Audits & Payouts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time evaluated QA audit achievements, base quota unlocks, and tiered slab accelerator bonuses.
          </p>
        </div>

        {/* Date Selector, Frequency Toggle & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Daily vs Monthly Toggle */}
          <div className="flex items-center p-1 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <button
              onClick={() => setFrequency("DAILY")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                frequency === "DAILY"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setFrequency("MONTHLY")}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                frequency === "MONTHLY"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Date Picker */}
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
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh QA Calculations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Data Source & Status Banner */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Live QA Feed Connected:</span>
          <code className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">
            /api/v1/slides/qa_audits.php
          </code>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>Overall Qual. Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{summary?.overall_qualification_rate_pct || 0}%</strong></span>
          <span>•</span>
          <span>Qualified: <strong className="text-slate-800 dark:text-slate-200 font-mono">{summary?.total_qualified || 0}</strong></span>
          <span>•</span>
          <span>Disqualified: <strong className="text-rose-500 font-mono">{summary?.total_disqualified || 0}</strong></span>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total QA Incentive</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(summary?.total_incentive || 0)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Across {summary?.eligible_count || 0} qualifying QA analysts
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Leads Audited</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
            {summary?.total_audits || 0} Leads
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {summary?.total_qualified || 0} Qualified • {summary?.total_disqualified || 0} Disqualified
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Qualification Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.overall_qualification_rate_pct || 0}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {summary?.eligible_count || 0} of {summary?.total_qa_analysts || 0} achieved base quota
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Configured Plans</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
            {plans.filter((p) => p.is_active).length} Plans
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Synced with QA database
          </p>
        </div>

        {/* Top Performer Card */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Top Performer
            </span>
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-500">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 font-bold text-base text-slate-900 dark:text-white truncate">
            {summary?.top_performer?.qa_name || "—"}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {summary?.top_performer ? `${summary.top_performer.total_audited} audits (${summary.top_performer.qualification_rate_pct}%)` : "Evaluating..."}
          </p>
        </div>
      </div>

      {/* Sub Tabs: Audit Calculations vs Saved Plans */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("audits")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "audits"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>QA Analyst Incentive Calculations ({calculations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "plans"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configured Incentive Plans ({plans.length})</span>
        </button>
      </div>

      {/* View 1: Audit Calculations Table */}
      {activeTab === "audits" && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-80 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search QA analyst by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
              />
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Live calculation from CRM feed:</span>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                {calculations.length} QA analysts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5 px-3">QA Analyst</th>
                  <th className="py-2.5 px-2 text-center">Applied Plan</th>
                  <th className="py-2.5 px-2 text-center">Base Target</th>
                  <th className="py-2.5 px-2 text-center text-purple-600 dark:text-purple-400 font-bold">
                    Actual Audited
                  </th>
                  <th className="py-2.5 px-2 text-center">Base Quota</th>
                  <th className="py-2.5 px-2 text-right">Base Cash (₹)</th>
                  <th className="py-2.5 px-2 text-right">Tier Slabs (₹)</th>
                  <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-bold">
                    Total Incentive (₹)
                  </th>
                  <th className="py-2.5 px-2 text-center">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredCalculations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                      No QA analysts found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCalculations.map((item) => {
                    const isExpanded = expandedRowId === item.qa_agent_id;
                    const hasLeads = Array.isArray(item.audited_leads) && item.audited_leads.length > 0;

                    return (
                      <React.Fragment key={item.qa_agent_id}>
                        <tr className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs">
                                {item.qa_agent_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{item.qa_agent_name}</span>
                                  {summary?.top_performer?.user_id === item.qa_agent_id && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      TOP
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span className="font-mono">ID: #{item.qa_agent_id}</span>
                                  {item.job_title && <span>• {item.job_title}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 truncate max-w-[140px] inline-block">
                              {item.plan_name}
                            </span>
                          </td>

                          <td className="py-3 px-2 text-center font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {item.base_target_leads} leads
                          </td>

                          <td className="py-3 px-2 text-center">
                            <div className="font-mono font-extrabold text-purple-600 dark:text-purple-400">
                              {item.actual_leads_audited} leads
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.qualified_leads} qual • {item.disqualified_leads} disq ({item.qualification_rate_pct ?? 0}%)
                            </div>
                          </td>

                          <td className="py-3 px-2 text-center">
                            {item.base_target_achieved ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Achieved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                <Clock className="w-3 h-3" /> In Progress
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatINR(item.base_incentive_earned)}
                          </td>

                          <td className="py-3 px-2 text-right">
                            {item.total_tier_incentive > 0 ? (
                              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                +{formatINR(item.total_tier_incentive)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                            {formatINR(item.total_incentive)}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setExpandedRowId(isExpanded ? null : item.qa_agent_id)}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                                title="Toggle breakdown"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              {hasLeads && (
                                <button
                                  onClick={() => setActiveLeadsModalAnalyst(item)}
                                  className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 cursor-pointer transition-colors"
                                  title="View Audited Leads"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 dark:bg-white/[0.02]">
                            <td colSpan={9} className="p-4 border-y border-slate-200/80 dark:border-white/10">
                              <div className="flex flex-col gap-3">
                                {/* Tier Slabs Breakdown */}
                                <div>
                                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                                    <span>Tier Slab Calculation Breakdown:</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                    {item.tier_breakdown && item.tier_breakdown.length > 0 ? (
                                      item.tier_breakdown.map((tb, idx) => (
                                        <div
                                          key={idx}
                                          className={`p-2.5 rounded-xl border text-xs ${
                                            tb.tier_incentive_earned > 0
                                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-200"
                                              : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-500"
                                          }`}
                                        >
                                          <div className="font-bold flex items-center justify-between">
                                            <span>{tb.tier_name}</span>
                                            <span className="font-mono">₹{tb.rate_per_lead}/lead</span>
                                          </div>
                                          <div className="mt-1 flex items-center justify-between text-[11px]">
                                            <span>Leads in tier: <strong>{tb.leads_in_tier}</strong></span>
                                            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                                              +{formatINR(tb.tier_incentive_earned)}
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 text-xs">No tier accelerators achieved.</span>
                                    )}
                                  </div>
                                </div>

                                {/* Campaigns & Clients Breakdown */}
                                {(item.campaigns_breakdown?.length || item.clients_breakdown?.length) ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
                                    {item.campaigns_breakdown && item.campaigns_breakdown.length > 0 && (
                                      <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                          Campaigns Audited ({item.campaigns_breakdown.length})
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.campaigns_breakdown.map((cb) => (
                                            <span
                                              key={cb.campaign_id}
                                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300"
                                            >
                                              <strong>{cb.campaign_name}</strong>: {cb.total_audited} audits ({cb.qualified} qual • {cb.disqualified} disq)
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {item.clients_breakdown && item.clients_breakdown.length > 0 && (
                                      <div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                          Client Accounts ({item.clients_breakdown.length})
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.clients_breakdown.map((clb, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[11px] text-slate-700 dark:text-slate-300"
                                            >
                                              <strong>{clb.client_name || clb.client_code}</strong>: {clb.total_audited} audits ({clb.qualified} qual)
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Audited Leads Drawer */}
      {activeLeadsModalAnalyst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-4xl max-h-[85vh] rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 flex flex-col shadow-2xl bg-white/95 dark:bg-slate-950/95 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-purple-500" />
                  Audited Leads Log — {activeLeadsModalAnalyst.qa_agent_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {activeLeadsModalAnalyst.audited_leads?.length || 0} inspected leads for shift date {selectedDate}
                </p>
              </div>
              <button
                onClick={() => setActiveLeadsModalAnalyst(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-500 text-[10px] uppercase font-bold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Lead Code</th>
                    <th className="py-2 px-2">Campaign</th>
                    <th className="py-2 px-2">Client</th>
                    <th className="py-2 px-2 text-center">QA Status</th>
                    <th className="py-2 px-2">Reviewed At</th>
                    <th className="py-2 px-3">QA Auditor Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {(activeLeadsModalAnalyst.audited_leads || []).map((lead, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {lead.lead_code || `#${lead.lead_id}`}
                      </td>
                      <td className="py-2.5 px-2">{lead.campaign_name}</td>
                      <td className="py-2.5 px-2 font-mono text-[11px]">{lead.client_code}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.qa_status === "Qualified"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {lead.qa_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-400 font-mono">
                        {lead.reviewed_at}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        {lead.qa_comment || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Configured Plans Management */}
      {activeTab === "plans" && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="text-xs text-slate-500">
            Active and archived QA incentive plans saved in the database.
          </div>

          <div className="space-y-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {p.plan_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.frequency === "DAILY"
                          ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
                          : "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                      }`}
                    >
                      {p.frequency}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>QA Scope: <strong className="text-slate-800 dark:text-slate-200">{p.qa_agent_name}</strong></span>
                    <span>•</span>
                    <span>Client: <strong className="text-slate-800 dark:text-slate-200">{p.client_code}</strong></span>
                    <span>•</span>
                    <span>Campaign: <strong className="text-slate-800 dark:text-slate-200">{p.campaign_name}</strong></span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                    Base: <strong>{p.base_target_leads} leads</strong> = <strong>{formatINR(p.base_incentive_amount)}</strong>
                    {p.tiers && p.tiers.length > 0 && (
                      <span className="ml-2 text-cyan-600 dark:text-cyan-400 font-medium">
                        ({p.tiers.length} Tiers: {p.tiers.map((t) => `${t.tier_name} @ ₹${t.rate_per_lead}`).join(" • ")})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTogglePlan(p)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    {p.is_active ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Inactive</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeletePlan(p.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

