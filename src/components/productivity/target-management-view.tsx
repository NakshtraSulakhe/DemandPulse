"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Users,
  Calendar,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  History,
  Search,
  Filter,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Edit2,
  AlertTriangle,
  Award,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export type EmployeeRole = "Agent" | "QA";

interface TargetAssignment {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_role: EmployeeRole;
  target_month: number;
  target_year: number;
  working_days: number;
  daily_target: number;
  calculated_monthly_target: number;
  adjusted_monthly_target: number | null;
  effective_monthly_target: number;
  adjustment_reason: string | null;
  is_manually_adjusted: boolean;
  quality_threshold_pct: number;
  effective_date: string;
  status: "active" | "inactive" | "archived";
  remarks: string | null;
  assigned_by: string;
}

interface TargetAudit {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_role: string;
  target_month: number;
  target_year: number;
  previous_daily_target: number | null;
  new_daily_target: number;
  previous_monthly_target: number | null;
  new_monthly_target: number;
  working_days: number;
  action: string;
  adjustment_reason: string | null;
  performed_by: string;
  created_at: string;
}

interface DiscoveredPerson {
  id: number;
  name: string;
  role: "Agent" | "QA";
  defaultDailyTarget?: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function TargetManagementView() {
  const now = new Date();
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("Agent");
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [searchTerm, setSearchTerm] = useState("");

  const [targets, setTargets] = useState<TargetAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<TargetAudit[]>([]);
  const [discoveredAgents, setDiscoveredAgents] = useState<DiscoveredPerson[]>([]);
  const [discoveredQa, setDiscoveredQa] = useState<DiscoveredPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Assignment Form State
  const [formData, setFormData] = useState({
    employee_id: 1,
    employee_name: "",
    employee_role: "Agent" as EmployeeRole,
    target_month: selectedMonth,
    target_year: selectedYear,
    working_days: 22,
    daily_target: 50,
    enableManualOverride: false,
    adjusted_monthly_target: 1100,
    adjustment_reason: "",
    quality_threshold_pct: 95,
    remarks: "",
  });

  // Fetch live discovered employees dynamically from API (zero hardcoding)
  const fetchMetadata = async () => {
    try {
      const res = await fetch("/api/productivity/meta");
      const json = await res.json();
      if (json.success && json.data) {
        setDiscoveredAgents(json.data.agents || []);
        setDiscoveredQa(json.data.qa_members || []);
      }
    } catch (err) {
      console.warn("Could not load employee metadata from API:", err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Load targets for selected role, month, year
  const fetchTargets = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/productivity/targets?role=${selectedRole}&month=${selectedMonth}&year=${selectedYear}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setTargets(json.data);
      } else {
        throw new Error(json.error || "Failed loading targets");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Load audit trail
  const fetchAuditHistory = async () => {
    try {
      const res = await fetch(`/api/productivity/targets/history?role=${selectedRole}&limit=50`);
      const json = await res.json();
      if (json.success && json.data) {
        setAuditLogs(json.data);
      }
    } catch (err) {
      console.warn("Could not load target audit history:", err);
    }
  };

  useEffect(() => {
    fetchTargets();
    fetchAuditHistory();
  }, [selectedRole, selectedMonth, selectedYear]);

  // Handle open assign modal
  const handleOpenAssignModal = (targetToEdit?: TargetAssignment) => {
    if (targetToEdit) {
      setFormData({
        employee_id: targetToEdit.employee_id,
        employee_name: targetToEdit.employee_name,
        employee_role: targetToEdit.employee_role,
        target_month: targetToEdit.target_month,
        target_year: targetToEdit.target_year,
        working_days: targetToEdit.working_days,
        daily_target: targetToEdit.daily_target,
        enableManualOverride: targetToEdit.is_manually_adjusted,
        adjusted_monthly_target: targetToEdit.adjusted_monthly_target || targetToEdit.calculated_monthly_target,
        adjustment_reason: targetToEdit.adjustment_reason || "",
        quality_threshold_pct: targetToEdit.quality_threshold_pct,
        remarks: targetToEdit.remarks || "",
      });
    } else {
      const defaultList = selectedRole === "Agent" ? discoveredAgents : discoveredQa;
      const first = defaultList.length > 0
        ? defaultList[0]
        : { id: 0, name: "", defaultDailyTarget: 50 };
      const defaultDaily = first.defaultDailyTarget || 50;
      setFormData({
        employee_id: first.id,
        employee_name: first.name,
        employee_role: selectedRole,
        target_month: selectedMonth,
        target_year: selectedYear,
        working_days: 22,
        daily_target: defaultDaily,
        enableManualOverride: false,
        adjusted_monthly_target: defaultDaily * 22,
        adjustment_reason: "",
        quality_threshold_pct: 95,
        remarks: "",
      });
    }
    setShowAssignModal(true);
  };

  // Calculated monthly target from daily * days
  const calculatedMonthly = useMemo(() => {
    return Math.round(Number(formData.daily_target) * Number(formData.working_days) * 100) / 100;
  }, [formData.daily_target, formData.working_days]);

  // Handle Target Save
  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!formData.employee_id || formData.employee_id <= 0) {
        throw new Error("Please select a valid employee discovered from the API.");
      }
      if (formData.daily_target <= 0) throw new Error("Daily target must be greater than zero.");
      if (formData.working_days <= 0 || formData.working_days > 31) {
        throw new Error("Working days must be between 1 and 31.");
      }
      if (formData.enableManualOverride && !formData.adjustment_reason.trim()) {
        throw new Error("Adjustment reason is mandatory when manually overriding monthly target.");
      }

      const payload = {
        employee_id: formData.employee_id,
        employee_name: formData.employee_name,
        employee_role: formData.employee_role,
        target_month: formData.target_month,
        target_year: formData.target_year,
        working_days: formData.working_days,
        daily_target: Number(formData.daily_target),
        adjusted_monthly_target: formData.enableManualOverride ? Number(formData.adjusted_monthly_target) : null,
        adjustment_reason: formData.enableManualOverride ? formData.adjustment_reason.trim() : null,
        quality_threshold_pct: Number(formData.quality_threshold_pct),
        remarks: formData.remarks || null,
      };

      const res = await fetch("/api/productivity/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save target");

      setSuccessMsg(json.message || "Target saved successfully!");
      setShowAssignModal(false);
      fetchTargets();
      fetchAuditHistory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Handle Copy from Previous Month
  const handleCopyPreviousMonth = async () => {
    const fromMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const fromYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/productivity/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy_previous",
          from_month: fromMonth,
          from_year: fromYear,
          to_month: selectedMonth,
          to_year: selectedYear,
          role: selectedRole,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed copying targets");

      setSuccessMsg(json.message);
      setShowCopyModal(false);
      fetchTargets();
      fetchAuditHistory();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Filtered targets
  const filteredTargets = useMemo(() => {
    if (!searchTerm.trim()) return targets;
    const q = searchTerm.toLowerCase();
    return targets.filter(
      (t) => t.employee_name.toLowerCase().includes(q) || String(t.employee_id).includes(q)
    );
  }, [targets, searchTerm]);

  // Summary KPIs
  const summary = useMemo(() => {
    const total = filteredTargets.length;
    const totalMonthly = filteredTargets.reduce((sum, t) => sum + t.effective_monthly_target, 0);
    const avgDaily = total > 0 ? Math.round((filteredTargets.reduce((sum, t) => sum + t.daily_target, 0) / total) * 10) / 10 : 0;
    const overriddenCount = filteredTargets.filter((t) => t.is_manually_adjusted).length;

    return { total, totalMonthly, avgDaily, overriddenCount };
  }, [filteredTargets]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Toast notifications */}
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

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Pill Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center gap-1">
            <button
              onClick={() => setSelectedRole("Agent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRole === "Agent"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Agent Targets (Points)
            </button>
            <button
              onClick={() => setSelectedRole("QA")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRole === "QA"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              QA Targets (Audits)
            </button>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
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
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
            >
              {[2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-cyan-500" />
            <span>Target History</span>
          </button>

          <button
            onClick={() => setShowCopyModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-500" />
            <span>Copy Previous Month</span>
          </button>

          <button
            onClick={() => handleOpenAssignModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Target</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Assigned {selectedRole}s
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summary.total}
            </div>
            <span className="text-[10px] text-slate-400">
              For {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Avg Daily Target
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {summary.avgDaily}
              <span className="text-xs font-normal text-slate-400 ml-1">
                {selectedRole === "Agent" ? "pts" : "audits"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Per employee quota</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Total Monthly Target
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {formatNumber(summary.totalMonthly)}
              <span className="text-xs font-normal text-slate-400 ml-1">
                {selectedRole === "Agent" ? "pts" : "audits"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Cumulative department quota</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">
              Manual Overrides
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {summary.overriddenCount}
            </div>
            <span className="text-[10px] text-slate-400">Adjusted with audit justification</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Target Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Table Search Bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredTargets.length} of {targets.length} targets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-center">Working Days</th>
                <th className="py-3 px-4 text-right">Daily Target</th>
                <th className="py-3 px-4 text-right">Monthly Target</th>
                <th className="py-3 px-4 text-center">Target Status</th>
                <th className="py-3 px-4">Assigned By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading targets...
                  </td>
                </tr>
              ) : filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No target assignments found for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                    <div className="mt-2">
                      <button
                        onClick={() => handleOpenAssignModal()}
                        className="text-cyan-600 font-bold hover:underline"
                      >
                        Assign first target
                      </button>{" "}
                      or{" "}
                      <button
                        onClick={() => setShowCopyModal(true)}
                        className="text-cyan-600 font-bold hover:underline"
                      >
                        copy from previous month
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTargets.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.employee_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {item.employee_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.employee_role === "Agent"
                            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                        }`}
                      >
                        {item.employee_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.working_days} days
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {item.daily_target} pts
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                        {formatNumber(item.effective_monthly_target)} pts
                      </div>
                      {item.is_manually_adjusted && (
                        <div
                          title={item.adjustment_reason || "Manually adjusted"}
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold cursor-help"
                        >
                          Manual Override (Calc: {item.calculated_monthly_target})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                      {item.assigned_by}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-300 hover:text-cyan-600 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assign / Edit Target */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Assign Productivity Target ({formData.employee_role})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Individual target configuration for {MONTH_NAMES[formData.target_month - 1]} {formData.target_year}
            </p>

            <form onSubmit={handleSaveTarget} className="flex flex-col gap-3.5 text-xs">
              {/* Employee Selection */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Select Employee (Live Discovery from API)</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    const list = formData.employee_role === "Agent" ? discoveredAgents : discoveredQa;
                    const match = list.find((m) => m.id === id);
                    if (match) {
                      setFormData((prev) => ({
                        ...prev,
                        employee_id: id,
                        employee_name: match.name,
                        daily_target: match.defaultDailyTarget || prev.daily_target,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {(formData.employee_role === "Agent" ? discoveredAgents : discoveredQa).length === 0 ? (
                    <option value="0">No active employees discovered from API</option>
                  ) : (
                    (formData.employee_role === "Agent" ? discoveredAgents : discoveredQa).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (ID: {m.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Working Days & Daily Target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Working Days</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={formData.working_days}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, working_days: parseInt(e.target.value, 10) || 22 }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Configurable working days</p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Daily Target (Productivity Points)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.5"
                    required
                    value={formData.daily_target}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, daily_target: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Base quota per working day in points</p>
                </div>
              </div>

              {/* Calculated Monthly Target Callout */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Calculated Monthly Target:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formData.daily_target} pts × {formData.working_days} days
                  </span>
                </div>
                <div className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {calculatedMonthly} PTS
                </div>
              </div>

              {/* Manual Override Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableManualOverride}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        enableManualOverride: e.target.checked,
                        adjusted_monthly_target: e.target.checked ? calculatedMonthly : calculatedMonthly,
                      }))
                    }
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="font-bold text-slate-900 dark:text-white">
                    Apply Authorized Manual Monthly Target Override
                  </span>
                </label>

                {formData.enableManualOverride && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 animate-fadeIn">
                    <div>
                      <label className="font-semibold text-amber-900 dark:text-amber-200 block mb-1">
                        Adjusted Monthly Target (Productivity Points)
                      </label>
                      <input
                        type="number"
                        min={1}
                        required={formData.enableManualOverride}
                        value={formData.adjusted_monthly_target}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            adjusted_monthly_target: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-400 font-mono font-bold text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-amber-900 dark:text-amber-200 block mb-1">
                        Mandatory Adjustment Reason
                      </label>
                      <input
                        type="text"
                        required={formData.enableManualOverride}
                        placeholder="e.g. Approved medical leave adjustment, mid-month onboarding"
                        value={formData.adjustment_reason}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, adjustment_reason: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-400 text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Optional Remarks</label>
                <input
                  type="text"
                  placeholder="Notes on performance quota"
                  value={formData.remarks}
                  onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Target Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Copy Previous Month Targets */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Copy Targets from Previous Month
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Copies active {selectedRole} targets from the previous month to{" "}
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}. Existing assignments are preserved.
            </p>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Source Month:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {selectedMonth === 1 ? 12 : selectedMonth - 1}/
                  {selectedMonth === 1 ? selectedYear - 1 : selectedYear}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Destination Month:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {selectedMonth}/{selectedYear}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Target Role:</span>
                <span className="font-bold">{selectedRole}s</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyPreviousMonth}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Copying..." : "Confirm & Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Target History Audit Trail */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-500" />
                  Employee Target Assignment Audit Trail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full historical log of target assignments, overrides, and adjustments
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No target history audit logs recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{log.employee_name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                          {log.employee_role}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {MONTH_NAMES[log.target_month - 1]} {log.target_year}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Reason: {log.adjustment_reason || "Standard assignment"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        By {log.performed_by} • {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        Monthly: {log.previous_monthly_target !== null ? `${log.previous_monthly_target} → ` : ""}
                        {log.new_monthly_target}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Daily: {log.new_daily_target} ({log.working_days} days)
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                        {log.action}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

