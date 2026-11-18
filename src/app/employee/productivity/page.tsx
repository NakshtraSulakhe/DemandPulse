"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Search,
  Check,
  Building,
  UserCheck,
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

function getTodayIso(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function EmployeeProductivityDashboard() {
  const [role, setRole] = useState<"Agent" | "QA">("Agent");
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredPerson[]>([]);
  const [discoveredQa, setDiscoveredQa] = useState<DiscoveredPerson[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Shift & Date Filter State
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const [searchFilter, setSearchFilter] = useState<string>("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Performance State from API
  const [performanceData, setPerformanceData] = useState<any>(null);

  // 1. Discover real employees dynamically from API
  const loadMeta = useCallback(async (targetDate?: string) => {
    setLoadingMeta(true);
    try {
      const dateToQuery = targetDate || selectedDate;
      const res = await fetch(`/api/productivity/meta?date=${dateToQuery}`);
      const json = await res.json();
      if (json.success && json.data) {
        const agents: DiscoveredPerson[] = json.data.agents || [];
        const qa: DiscoveredPerson[] = json.data.qa_members || [];
        setDiscoveredAgents(agents);
        setDiscoveredQa(qa);

        // Auto-select first employee if none selected or not in list
        if (role === "Agent" && agents.length > 0) {
          setSelectedEmployeeId((prev) => (prev && agents.some((a) => a.id === prev) ? prev : agents[0].id));
        } else if (role === "QA" && qa.length > 0) {
          setSelectedEmployeeId((prev) => (prev && qa.some((q) => q.id === prev) ? prev : qa[0].id));
        }
      }
    } catch {
      setErrorMsg("Failed loading employee directory from API");
    } finally {
      setLoadingMeta(false);
    }
  }, [role, selectedDate]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Update selected employee when switching roles
  useEffect(() => {
    if (role === "Agent" && discoveredAgents.length > 0) {
      if (!discoveredAgents.some((a) => a.id === selectedEmployeeId)) {
        setSelectedEmployeeId(discoveredAgents[0].id);
      }
    } else if (role === "QA" && discoveredQa.length > 0) {
      if (!discoveredQa.some((q) => q.id === selectedEmployeeId)) {
        setSelectedEmployeeId(discoveredQa[0].id);
      }
    }
  }, [role, discoveredAgents, discoveredQa, selectedEmployeeId]);

  // 2. Fetch live performance metrics from API
  const fetchPerformance = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setLoadingPerformance(true);
    setErrorMsg(null);
    try {
      const url = `/api/productivity/employee-performance?employee_id=${selectedEmployeeId}&role=${role}&date=${selectedDate}&month=${selectedMonth}&year=${selectedYear}`;
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
  }, [selectedEmployeeId, role, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchPerformance();
    }
  }, [fetchPerformance, selectedEmployeeId, role, selectedDate, selectedMonth, selectedYear]);

  // Handle Shift Date Selection
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const parts = newDate.split("-");
    if (parts.length === 3) {
      setSelectedYear(parseInt(parts[0], 10));
      setSelectedMonth(parseInt(parts[1], 10));
    }
  };

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    const now = new Date();
    if (newMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear()) {
      setSelectedDate(getTodayIso());
    } else {
      setSelectedDate(`${selectedYear}-${String(newMonth).padStart(2, "0")}-01`);
    }
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const now = new Date();
    if (selectedMonth === (now.getMonth() + 1) && newYear === now.getFullYear()) {
      setSelectedDate(getTodayIso());
    } else {
      setSelectedDate(`${newYear}-${String(selectedMonth).padStart(2, "0")}-01`);
    }
  };

  const currentList = role === "Agent" ? discoveredAgents : discoveredQa;

  const filteredEmployees = useMemo(() => {
    if (!searchFilter.trim()) return currentList;
    const term = searchFilter.toLowerCase().trim();
    return currentList.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        String(e.id).includes(term) ||
        (e.department && e.department.toLowerCase().includes(term))
    );
  }, [currentList, searchFilter]);

  const currentEmployee = useMemo(() => {
    const found = currentList.find((e) => e.id === selectedEmployeeId);
    if (found) return found;
    if (currentList.length > 0) return currentList[0];
    return {
      id: selectedEmployeeId || 1,
      name: performanceData?.employeeName || (role === "Agent" ? "SDR Agent" : "QA Analyst"),
      role,
    };
  }, [currentList, selectedEmployeeId, role, performanceData]);

  const metrics = performanceData?.metrics;
  const isToday = selectedDate === getTodayIso();
  const isYesterday = selectedDate === getYesterdayIso();

  return (
    <div className="flex flex-col gap-6 animate-fadeIn font-sans">
      {/* Top Filter and Controls Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-sm">
        {/* Role Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded-xl bg-slate-200/70 dark:bg-white/[0.05] border border-slate-300 dark:border-white/10 flex items-center gap-1 text-xs font-bold">
            <button
              onClick={() => setRole("Agent")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                role === "Agent"
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Agent Portal ({discoveredAgents.length})
            </button>
            <button
              onClick={() => setRole("QA")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                role === "QA"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              QA Specialist Portal ({discoveredQa.length})
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => handleDateChange(getTodayIso())}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer ${
                isToday
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-bold"
                  : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateChange(getYesterdayIso())}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer ${
                isYesterday
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-bold"
                  : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
              }`}
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Date, Month, Year & Employee Pickers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Shift Date Picker */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>

          {/* Month & Year Selectors */}
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Dynamic Employee Selector */}
          <select
            value={selectedEmployeeId || ""}
            onChange={(e) => setSelectedEmployeeId(parseInt(e.target.value, 10))}
            disabled={loadingMeta || currentList.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer shadow-sm min-w-[190px]"
          >
            {loadingMeta ? (
              <option value="">Discovering {role}s...</option>
            ) : filteredEmployees.length === 0 ? (
              <option value="">No {role}s found</option>
            ) : (
              filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} (ID: #{emp.id})
                </option>
              ))
            )}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => {
              loadMeta();
              fetchPerformance();
            }}
            disabled={loadingPerformance || loadingMeta}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh Live Performance Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPerformance || loadingMeta ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center justify-between shadow-sm">
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
      <div className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0 ${
              role === "Agent"
                ? "bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-600/30"
                : "bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-purple-600/30"
            }`}
          >
            {currentEmployee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 mb-1">
              <Sparkles className="w-3 h-3" />
              {role === "Agent" ? "Sales Development Representative (SDR)" : "Quality Assurance Analyst (QA)"}
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {performanceData?.employeeName || currentEmployee.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Employee ID: <strong className="font-mono text-slate-700 dark:text-slate-300">#{currentEmployee.id}</strong></span>
              <span>•</span>
              <span>Shift Date: <strong className="font-mono text-cyan-600 dark:text-cyan-400">{selectedDate}</strong></span>
              <span>•</span>
              <span>Monthly Target: <strong className="font-mono text-slate-700 dark:text-slate-300">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-right shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Shift Incentive</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(metrics?.dailyIncentiveEarned || 0)}
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-right shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Incentive</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {formatINR(metrics?.monthlyIncentive || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Content Views */}
      {loadingPerformance ? (
        <div className="glass-panel p-16 rounded-2xl border border-slate-200/80 dark:border-white/10 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-cyan-500" />
          <span className="font-semibold">Calculating live productivity metrics from CRM API & database...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Daily & Monthly Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Shift Performance Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className={`w-4 h-4 ${role === "Agent" ? "text-cyan-500" : "text-purple-500"}`} />
                  Shift Performance ({selectedDate})
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    role === "Agent"
                      ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                  }`}
                >
                  {role} Daily Points Quota
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Daily Target</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {metrics?.dailyTarget || 50}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">PTS</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Achieved</span>
                  <span
                    className={`text-xl font-black font-mono ${
                      role === "Agent" ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {metrics?.actualDailyPoints || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">PTS</span>
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
                  <span className="text-[10px] text-slate-400 font-semibold block truncate">
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
                  <span
                    className={`font-bold font-mono ${
                      role === "Agent" ? "text-cyan-600 dark:text-cyan-400" : "text-purple-600 dark:text-purple-400"
                    }`}
                  >
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
                  <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Today's Earned Daily Incentive
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      {(metrics?.dailyAchievementPct || 0) >= 100
                        ? "Target achieved: Base + Tier Accelerator bonus"
                        : `Shift in progress (Need ${metrics?.remainingDailyPoints || 0} more points)`}
                    </span>
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatINR(metrics?.dailyIncentiveEarned || 0)}
                </div>
              </div>
            </div>

            {/* Monthly Performance Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Monthly Cumulative Progress ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  {metrics?.workingDays || 22} Working Days
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Monthly Target</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatNumber(metrics?.monthlyTarget || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">PTS</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Actual Points</span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                    {formatNumber(metrics?.actualMonthlyPoints || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">PTS</span>
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
                  <span className="text-[10px] text-slate-400 font-semibold block truncate">
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
            <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    QA Quality & Accuracy Scorecard
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shift Verified Volume: <strong className="font-mono text-purple-600 dark:text-purple-400">{metrics?.actualDailyAudits || 0} audits</strong> on {selectedDate} ({metrics?.actualMonthlyAudits || 0} audits monthly).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Shift Audits</span>
                  <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                    {metrics?.actualDailyAudits || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Campaign-Wise Productivity Points Breakdown Table */}
          <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  Campaign & Activity-Wise Points Breakdown ({role})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Point Multiplier Formula: Total Earned Points = Sum(Activity Volume × Configured Multiplier)
                </p>
              </div>
              <div className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Shift Total: {metrics?.actualDailyPoints || 0} PTS
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4 sm:px-6">Activity / Campaign Name</th>
                    <th className="py-3 px-4 text-center">
                      {role === "Agent" ? "Verified Qualified Volume" : "Verified Audits Processed"}
                    </th>
                    <th className="py-3 px-4 text-center">Configured Point Multiplier</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Earned Productivity Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {(metrics?.campaignBreakdown || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No activity records logged for this employee on shift date {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    (metrics?.campaignBreakdown || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-bold text-slate-900 dark:text-white">
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                            {item.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {item.qty} {role === "Agent" ? "leads" : "audits"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[11px] font-semibold">
                            {item.pointsPerUnit} pts/{role === "Agent" ? "lead" : "audit"}
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right font-mono font-black text-cyan-600 dark:text-cyan-400">
                          {item.totalPoints} pts
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.03] font-bold text-xs">
                    <td className="py-3 px-4 sm:px-6 text-slate-900 dark:text-white">Total Shift Verified Output</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-900 dark:text-white">
                      {(metrics?.campaignBreakdown || []).reduce((acc: number, curr: any) => acc + (curr.qty || 0), 0)}{" "}
                      {role === "Agent" ? "leads" : "audits"}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">—</td>
                    <td className="py-3 px-4 sm:px-6 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {metrics?.actualDailyPoints || 0} pts
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
