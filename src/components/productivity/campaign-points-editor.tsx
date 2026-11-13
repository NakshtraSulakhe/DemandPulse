"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  History,
  RotateCcw,
  Sparkles,
  Calculator,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  Globe,
  Filter,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

export type DeptType = "ALL" | "Agent" | "QA";

interface PointConfig {
  id: string;
  activity_type: string;
  display_name: string;
  department: DeptType;
  points_factor: number;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  version: number;
  updated_by: string;
}

interface PointAudit {
  id: string;
  activity_type: string;
  department: DeptType;
  previous_points: number | null;
  new_points: number;
  action: string;
  performed_by: string;
  remarks: string | null;
  created_at: string;
}

export default function CampaignPointsEditor() {
  const [configs, setConfigs] = useState<PointConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<PointAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Tab filter: "ALL_TAB" = All configs, "GLOBAL" = Global rules, "AGENT" = Agent rules, "QA" = QA rules
  const [selectedTab, setSelectedTab] = useState<"ALL_TAB" | "GLOBAL" | "AGENT" | "QA">("ALL_TAB");

  // Edit / Add modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<{
    activity_type: string;
    display_name: string;
    department: DeptType;
    points_factor: number;
    description: string;
    remarks: string;
  }>({
    activity_type: "",
    display_name: "",
    department: "ALL",
    points_factor: 1.0,
    description: "",
    remarks: "",
  });

  // Simulator department scope ("Agent" or "QA")
  const [simDept, setSimDept] = useState<"Agent" | "QA">("QA");

  // Simulator quantities (matching DemandFlow Bridge reference example)
  const [simQuantities, setSimQuantities] = useState<Record<string, number>>({
    email_marketing: 20,
    mql: 10,
    hql_callback: 5,
    bant: 3,
    appointment_generation: 2,
  });

  const fetchConfigs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/productivity/points?include_audit=true&include_inactive=false");
      const json = await res.json();
      if (json.success && json.data) {
        setConfigs(json.data.configs || []);
        setAuditLogs(json.data.auditLogs || []);
      } else {
        throw new Error(json.error || "Failed to load productivity point configs");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleOpenEdit = (config?: PointConfig, presetDept?: DeptType) => {
    if (config) {
      setEditItem({
        activity_type: config.activity_type,
        display_name: config.display_name,
        department: config.department || "ALL",
        points_factor: config.points_factor,
        description: config.description || "",
        remarks: "",
      });
    } else {
      const defaultDept: DeptType = presetDept
        ? presetDept
        : selectedTab === "QA"
        ? "QA"
        : selectedTab === "AGENT"
        ? "Agent"
        : "ALL";

      setEditItem({
        activity_type: "",
        display_name: "",
        department: defaultDept,
        points_factor: 1.0,
        description: "",
        remarks: `New point rule configured for ${defaultDept} department`,
      });
    }
    setShowEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!editItem.display_name.trim()) throw new Error("Display name is required.");
      if (editItem.points_factor <= 0) throw new Error("Point factor must be greater than zero.");

      const activityType = editItem.activity_type.trim()
        ? editItem.activity_type
        : editItem.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

      const res = await fetch("/api/productivity/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_type: activityType,
          display_name: editItem.display_name.trim(),
          department: editItem.department,
          points_factor: Number(editItem.points_factor),
          description: editItem.description.trim() || null,
          remarks: editItem.remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to save point factor");

      setSuccessMsg(json.message || "Point configuration saved successfully!");
      setShowEditModal(false);
      fetchConfigs();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Filtered configs for table display
  const displayedConfigs = useMemo(() => {
    if (selectedTab === "GLOBAL") {
      return configs.filter((c) => c.department === "ALL");
    }
    if (selectedTab === "AGENT") {
      return configs.filter((c) => c.department === "Agent" || c.department === "ALL");
    }
    if (selectedTab === "QA") {
      return configs.filter((c) => c.department === "QA" || c.department === "ALL");
    }
    return configs;
  }, [configs, selectedTab]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: configs.length,
      global: configs.filter((c) => c.department === "ALL").length,
      agent: configs.filter((c) => c.department === "Agent").length,
      qa: configs.filter((c) => c.department === "QA").length,
    };
  }, [configs]);

  // Effective multipliers map for simulator
  const simEffectiveMap = useMemo(() => {
    const map: Record<string, { factor: number; source: string; name: string }> = {};

    // 1. Seed global
    configs
      .filter((c) => c.department === "ALL")
      .forEach((c) => {
        map[c.activity_type] = {
          factor: c.points_factor,
          source: "Global",
          name: c.display_name,
        };
      });

    // 2. Overwrite with department specific
    configs
      .filter((c) => c.department === simDept)
      .forEach((c) => {
        map[c.activity_type] = {
          factor: c.points_factor,
          source: `${simDept} Custom`,
          name: c.display_name,
        };
      });

    return map;
  }, [configs, simDept]);

  // Live simulation calculation based on selected department
  const simResults = useMemo(() => {
    let totalPoints = 0;
    const items = Object.entries(simEffectiveMap).map(([actType, info]) => {
      const qty = simQuantities[actType] || 0;
      const points = Math.round(qty * info.factor * 100) / 100;
      totalPoints += points;
      return {
        activity_type: actType,
        display_name: info.name,
        source: info.source,
        points_factor: info.factor,
        qty,
        points,
      };
    });

    return {
      items,
      totalPoints: Math.round(totalPoints * 100) / 100,
    };
  }, [simEffectiveMap, simQuantities]);

  const getDeptBadge = (dept: DeptType) => {
    if (dept === "QA") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30">
          <ShieldCheck className="w-3 h-3" />
          QA Department
        </span>
      );
    }
    if (dept === "Agent") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
          <Users className="w-3 h-3" />
          Agent Department
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
        <Globe className="w-3 h-3" />
        Global (All)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Notifications */}
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

      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 mb-1.5">
            <Award className="w-3.5 h-3.5" />
            Department-Scoped Productivity Points
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Campaign & Productivity Point Configuration
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Configure campaign activity points independently for <strong>QA Department</strong> and <strong>Agent Department</strong>. Calculations evaluate campaign points per audit rather than raw lead count.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-cyan-500" />
            <span>Point Audit History</span>
          </button>

          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity Point</span>
          </button>
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
        <button
          onClick={() => setSelectedTab("ALL_TAB")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedTab === "ALL_TAB"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>All Rules</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50 dark:bg-slate-700">
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setSelectedTab("QA")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedTab === "QA"
              ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-purple-500/10 hover:text-purple-600"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>QA Department</span>
          {tabCounts.qa > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-200/60 dark:bg-purple-800 text-purple-900 dark:text-purple-100">
              {tabCounts.qa} custom
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedTab("AGENT")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedTab === "AGENT"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-blue-500/10 hover:text-blue-600"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Agent Department</span>
          {tabCounts.agent > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-200/60 dark:bg-blue-800 text-blue-900 dark:text-blue-100">
              {tabCounts.agent} custom
            </span>
          )}
        </button>

        <button
          onClick={() => setSelectedTab("GLOBAL")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedTab === "GLOBAL"
              ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/20"
              : "text-slate-600 dark:text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-600"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Global (All)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/50 dark:bg-slate-700">
            {tabCounts.global}
          </span>
        </button>
      </div>

      {/* Main Grid: Config Table + Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Points Configuration Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Activity / Campaign Type</th>
                  <th className="py-3 px-4">Department Scope</th>
                  <th className="py-3 px-4 text-center">Point Multiplier</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                {displayedConfigs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.display_name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {item.activity_type}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getDeptBadge(item.department)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                        {item.points_factor} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {item.effective_from}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        v{item.version}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors cursor-pointer"
                      >
                        Edit Points
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/60 dark:bg-white/[0.01] border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Showing {displayedConfigs.length} campaign point rules ({selectedTab})</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Immutable Historical Audit Active
            </span>
          </div>
        </div>

        {/* Right Column: Live Productivity Simulator (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-500" />
                Live Point Multiplier Simulator
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Formula: Total Points = Sum(Audited / Generated Leads × Multiplier)
              </p>
            </div>
            <button
              onClick={() =>
                setSimQuantities({
                  email_marketing: 20,
                  mql: 10,
                  hql_callback: 5,
                  bant: 3,
                  appointment_generation: 2,
                })
              }
              className="text-[11px] font-semibold text-cyan-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Department Simulator Toggle */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2">Department:</span>
            <button
              onClick={() => setSimDept("QA")}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                simDept === "QA"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
              }`}
            >
              QA Department
            </button>
            <button
              onClick={() => setSimDept("Agent")}
              className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                simDept === "Agent"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
              }`}
            >
              Agent Department
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {simResults.items.map((item) => (
              <div
                key={item.activity_type}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.display_name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {item.source}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Rate: {item.points_factor} pts/lead</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setSimQuantities((prev) => ({ ...prev, [item.activity_type]: val }));
                      }}
                      className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-center outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="w-20 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    = {item.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Simulator Total Callout */}
          <div className="mt-2 p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                Total {simDept} Productivity Points
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Calculated using {simDept} point multipliers
              </span>
            </div>
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {simResults.totalPoints} <span className="text-xs font-semibold text-slate-400">PTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Edit / Add Activity Point */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {editItem.activity_type ? "Update Activity Point Factor" : "Add New Activity Point"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configure point multipliers per campaign/activity type. Changes are versioned and audited.
            </p>

            <form onSubmit={handleSave} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Department Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditItem((prev) => ({ ...prev, department: "ALL" }))}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      editItem.department === "ALL"
                        ? "bg-cyan-600 text-white border-cyan-500"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Global (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem((prev) => ({ ...prev, department: "QA" }))}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      editItem.department === "QA"
                        ? "bg-purple-600 text-white border-purple-500"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    QA Dept
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem((prev) => ({ ...prev, department: "Agent" }))}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      editItem.department === "Agent"
                        ? "bg-blue-600 text-white border-blue-500"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    Agent Dept
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Campaign / Activity Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editItem.display_name}
                  onChange={(e) => setEditItem((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="e.g. Email Marketing, MQL, BANT, Callback"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Points Factor (Fractional values supported, e.g. 0.25, 1.0, 2.0, 3.0, 5.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  required
                  value={editItem.points_factor}
                  onChange={(e) =>
                    setEditItem((prev) => ({ ...prev, points_factor: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={editItem.description}
                  onChange={(e) => setEditItem((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes on activity qualification or QA audit criteria"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Change Remarks (Recorded in audit trail)
                </label>
                <input
                  type="text"
                  value={editItem.remarks}
                  onChange={(e) => setEditItem((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Reason for modifying points factor"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Point Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audit Log Trail */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-500" />
                  Productivity Points Audit Trail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Full historical log of all point multiplier revisions and department scopes
                </p>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-200/60 dark:divide-white/5 text-xs">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No audit records recorded yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{log.activity_type}</span>
                        {getDeptBadge(log.department)}
                      </div>
                      <div className="text-[11px] text-slate-500">{log.remarks || "No remarks"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        By {log.performed_by} • {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                        {log.previous_points !== null ? `${log.previous_points} → ` : ""}
                        {log.new_points} pts
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
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
