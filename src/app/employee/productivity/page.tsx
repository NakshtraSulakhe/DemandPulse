"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  User,
  Target,
  Award,
  Coins,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Percent,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Sparkles,
  BarChart3,
  ChevronRight,
  Layers,
  RefreshCw,
} from "lucide-react";
import { formatINR, formatPercentage } from "@/lib/incentives/formatters";
import { formatNumber } from "@/lib/utils";

interface DiscoveredPerson {
  id: number;
  name: string;
  role: "Agent" | "QA";
  department?: string;
  defaultDailyTarget?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function EmployeeProductivityDashboard() {
  const [role, setRole] = useState<"Agent" | "QA">("Agent");
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredPerson[]>([]);
  const [discoveredQa, setDiscoveredQa] = useState<DiscoveredPerson[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Performance State from API
  const [performanceData, setPerformanceData] = useState<any>(null);

  // 1. Discover employees dynamically from API
  useEffect(() => {
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const res = await fetch("/api/productivity/meta");
        const json = await res.json();
        if (json.success && json.data) {
          const agents = json.data.agents || [];
          const qa = json.data.qa_members || [];
          setDiscoveredAgents(agents);
          setDiscoveredQa(qa);

          if (role === "Agent" && agents.length > 0) {
            setSelectedEmployeeId(agents[0].id);
          } else if (role === "QA" && qa.length > 0) {
            setSelectedEmployeeId(qa[0].id);
          }
        }
      } catch (err) {
        setErrorMsg("Failed loading employee directory from API");
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // Update selected employee when role changes
  useEffect(() => {
    if (role === "Agent" && discoveredAgents.length > 0) {
      setSelectedEmployeeId(discoveredAgents[0].id);
    } else if (role === "QA" && discoveredQa.length > 0) {
      setSelectedEmployeeId(discoveredQa[0].id);
    }
  }, [role, discoveredAgents, discoveredQa]);

  // 2. Fetch live performance metrics from API whenever employee or period changes
  const fetchPerformance = async () => {
    if (!selectedEmployeeId) return;
    setLoadingPerformance(true);
    setErrorMsg(null);
    try {
      const url = `/api/productivity/employee-performance?employee_id=${selectedEmployeeId}&role=${role}&month=${selectedMonth}&year=${selectedYear}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setPerformanceData(json);
      } else {
        throw new Error(json.error || "Failed to load employee metrics");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPerformance();
    }
  }, [selectedEmployeeId, role, selectedMonth, selectedYear]);

  const currentList = role === "Agent" ? discoveredAgents : discoveredQa;
  const currentEmployee = useMemo(() => {
    return (
      currentList.find((e) => e.id === selectedEmployeeId) ||
      (currentList.length > 0
        ? currentList[0]
        : { id: selectedEmployeeId || 1, name: "Employee", role })
    );
  }, [currentList, selectedEmployeeId, role]);

  const metrics = performanceData?.metrics;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fadeIn">
        {/* Top Breadcrumb & Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/admin" className="hover:text-cyan-600 transition-colors">
              DemandPulse
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/admin/incentives" className="hover:text-cyan-600 transition-colors">
              Incentive Hub
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-slate-900 dark:text-white">Live Employee Performance Portal</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Month & Year Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-semibold outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
              >
                {[2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-white/10 flex items-center gap-1 text-xs">
              <button
                onClick={() => setRole("Agent")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  role === "Agent" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Agent Portal
              </button>
              <button
                onClick={() => setRole("QA")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  role === "QA" ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                QA Specialist Portal
              </button>
            </div>

            {/* Dynamic Employee Selector */}
            <select
              value={selectedEmployeeId || ""}
              onChange={(e) => setSelectedEmployeeId(parseInt(e.target.value, 10))}
              disabled={loadingMeta || currentList.length === 0}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-semibold outline-none focus:border-cyan-500 cursor-pointer shadow-sm min-w-[160px]"
            >
              {currentList.length === 0 ? (
                <option value="">No {role}s discovered</option>
              ) : (
                currentList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} (ID: {emp.id})
                  </option>
                ))
              )}
            </select>

            <button
              onClick={fetchPerformance}
              disabled={loadingPerformance}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Performance Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPerformance ? "animate-spin text-cyan-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${
                role === "Agent"
                  ? "bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-600/30"
                  : "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/30"
              }`}
            >
              {currentEmployee.name.charAt(0)}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-1">
                <Sparkles className="w-3 h-3" />
                {role === "Agent" ? "Sales Development Representative" : "Quality Assurance Analyst"}
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentEmployee.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Employee ID #{currentEmployee.id} • Assigned Target Month: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Daily Incentive</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(metrics?.dailyIncentiveEarned || 0)}
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Incentive</span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {formatINR(metrics?.monthlyIncentive || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Views */}
        {loadingPerformance ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
            Calculating live productivity metrics from CRM API...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Daily & Monthly Performance Grid (Unified Pointing Structure for Agent & QA) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Daily Performance Card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className={`w-4 h-4 ${role === "Agent" ? "text-cyan-500" : "text-purple-500"}`} />
                    Today's {role} Shift Performance
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    role === "Agent"
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                  }`}>
                    {role} Daily Points Quota
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Target</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {metrics?.dailyTarget || 0}
                    </span>
                    <span className="text-[10px] text-slate-400">PTS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Achieved</span>
                    <span className={`text-xl font-black font-mono ${
                      role === "Agent" ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"
                    }`}>
                      {metrics?.actualDailyPoints || 0}
                    </span>
                    <span className="text-[10px] text-slate-400">PTS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Achievement</span>
                    <span
                      className={`text-xl font-black font-mono ${
                        (metrics?.dailyAchievementPct || 0) >= 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-500"
                      }`}
                    >
                      {metrics?.dailyAchievementPct || 0}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(metrics?.remainingDailyPoints || 0) > 0
                        ? `${metrics?.remainingDailyPoints} pts left`
                        : "Target Achieved!"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600 dark:text-slate-400">Shift Target Completion</span>
                    <span className={`font-bold font-mono ${
                      role === "Agent" ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"
                    }`}>
                      {metrics?.dailyAchievementPct || 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (metrics?.dailyAchievementPct || 0) >= 100
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : role === "Agent"
                          ? "bg-cyan-500"
                          : "bg-purple-500"
                      }`}
                      style={{ width: `${Math.min(100, metrics?.dailyAchievementPct || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Daily Reward Summary */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Today's Earned Daily Incentive
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {(metrics?.dailyAchievementPct || 0) >= 100
                          ? "Target achieved: Base + Tier Accelerator bonus"
                          : "Target not achieved yet (Need 100%)"}
                      </span>
                    </div>
                  </div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatINR(metrics?.dailyIncentiveEarned || 0)}
                  </div>
                </div>
              </div>

              {/* Monthly Performance Card */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    Monthly Cumulative Progress ({role})
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    {metrics?.workingDays || 22} Working Days
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Target</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {formatNumber(metrics?.monthlyTarget || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">PTS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Actual Points</span>
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                      {formatNumber(metrics?.actualMonthlyPoints || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400">PTS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly %</span>
                    <span
                      className={`text-xl font-black font-mono ${
                        (metrics?.monthlyAchievementPct || 0) >= 100
                          ? "text-purple-600 dark:text-purple-400"
                          : "text-slate-500"
                      }`}
                    >
                      {metrics?.monthlyAchievementPct || 0}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(metrics?.remainingMonthlyPoints || 0) > 0
                        ? `${metrics?.remainingMonthlyPoints} pts left`
                        : "Target Achieved!"}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-600 dark:text-slate-400">Monthly Target Completion</span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                      {metrics?.monthlyAchievementPct || 0}%
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, metrics?.monthlyAchievementPct || 0)}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Reward & Current Slab */}
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Qualifying Milestone Slab
                    </span>
                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                      {metrics?.currentSlab || "Below 90% (₹0)"}
                    </span>
                  </div>
                  <div className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                    {formatINR(metrics?.monthlyIncentive || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* QA Specific Quality Score & Accuracy Telemetry Card */}
            {role === "QA" && (
              <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      QA Quality & Accuracy Scorecard
                    </h3>
                    <p className="text-xs text-slate-500">
                      Evaluated on verified audited volume: {metrics?.actualDailyAudits || 0} audits today ({metrics?.actualMonthlyAudits || 0} monthly).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Audit Accuracy</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {metrics?.qualityScore || 100}%
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Rework / Error Rate</span>
                    <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">
                      {metrics?.reworkPct || 0}%
                    </span>
                  </div>

                  <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Audits</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                      {metrics?.actualDailyAudits || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign-Wise Productivity Points Breakdown Table (Identical Pointing Structure for Agent & QA) */}
            <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Campaign & Activity-Wise Points Breakdown ({role})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Point multiplier formula: Total Points = Sum(Verified Qty × Configured Activity Points)
                  </p>
                </div>
                <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  Total Today: {metrics?.actualDailyPoints || 0} pts
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Activity / Campaign Type</th>
                      <th className="py-3 px-4 text-center">
                        {role === "Agent" ? "Qualified Leads Generated" : "Verified Audits Processed"}
                      </th>
                      <th className="py-3 px-4 text-center">Configured Point Multiplier</th>
                      <th className="py-3 px-4 text-right">Earned Productivity Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                    {(metrics?.campaignBreakdown || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {item.qty} {role === "Agent" ? "leads" : "audits"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {item.pointsPerUnit} pts/{role === "Agent" ? "lead" : "audit"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-cyan-600 dark:text-cyan-400">
                          {item.totalPoints} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
