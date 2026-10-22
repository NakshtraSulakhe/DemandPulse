"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Shield,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Info,
  Sparkles,
  RefreshCw,
  Layers,
  Award,
  Calendar,
  Check,
  X,
  UserCheck,
  Zap,
} from "lucide-react";
import {
  IncentiveConfiguration,
  IncentiveTierSlab,
  IncentiveRuleOverride,
} from "@/types/incentive-config";
import {
  calculateIncentiveBreakdown,
  DEFAULT_INCENTIVE_CONFIG,
} from "@/lib/incentives/rules-evaluator";
import { formatINR, formatPercentage } from "@/lib/incentives/formatters";

export default function IncentiveConfigurationPage() {
  const [config, setConfig] = useState<IncentiveConfiguration>(DEFAULT_INCENTIVE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live Simulator State
  const [simTarget, setSimTarget] = useState<number>(10);
  const [simAchieved, setSimAchieved] = useState<number>(14);
  const [simAttendance, setSimAttendance] = useState<string>("Present");
  const [simEscalation, setSimEscalation] = useState<boolean>(false);
  const [simRole, setSimRole] = useState<string>("Senior SDR");

  // Fetch active configuration
  const fetchConfig = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/incentives/config", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
      } else {
        setSaveError(json.error || "Failed to load incentive configuration");
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/incentives/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
        setSaveSuccess(`Incentive rules updated successfully to Version ${json.data.version}!`);
        setTimeout(() => setSaveSuccess(null), 5000);
      } else {
        setSaveError(json.error || "Failed to save configuration");
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Add / Remove Slabs
  const handleAddSlab = () => {
    const lastSlab = config.tieredSlabs[config.tieredSlabs.length - 1];
    const newMin = lastSlab ? (lastSlab.maxPct || lastSlab.minPct + 50) : 100;
    const newSlab: IncentiveTierSlab = {
      id: `slab-${Date.now()}`,
      name: `Tier ${config.tieredSlabs.length + 1} (${newMin}%+)`,
      minPct: newMin,
      maxPct: null,
      ratePerPoint: 100,
      description: `Accelerator for points exceeding ${newMin}%`,
    };
    setConfig((prev) => ({
      ...prev,
      tieredSlabs: [...prev.tieredSlabs, newSlab],
    }));
  };

  const handleUpdateSlab = (idx: number, updates: Partial<IncentiveTierSlab>) => {
    setConfig((prev) => {
      const updated = [...prev.tieredSlabs];
      updated[idx] = { ...updated[idx], ...updates };
      return { ...prev, tieredSlabs: updated };
    });
  };

  const handleRemoveSlab = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      tieredSlabs: prev.tieredSlabs.filter((_, i) => i !== idx),
    }));
  };

  // Add / Remove Overrides
  const handleAddOverride = () => {
    const newOverride: IncentiveRuleOverride = {
      id: `override-${Date.now()}`,
      targetType: "role",
      targetIdentifier: "Outbound SDR",
      baseIncentiveOverride: 500,
      multiplier: 1.0,
      isActive: true,
      notes: "Custom role rate",
    };
    setConfig((prev) => ({
      ...prev,
      overrides: [...prev.overrides, newOverride],
    }));
  };

  const handleUpdateOverride = (idx: number, updates: Partial<IncentiveRuleOverride>) => {
    setConfig((prev) => {
      const updated = [...prev.overrides];
      updated[idx] = { ...updated[idx], ...updates };
      return { ...prev, overrides: updated };
    });
  };

  const handleRemoveOverride = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      overrides: prev.overrides.filter((_, i) => i !== idx),
    }));
  };

  // Live simulation calculated breakdown
  const simResult = useMemo(() => {
    return calculateIncentiveBreakdown(
      simAchieved,
      simTarget,
      simAttendance,
      simEscalation,
      config,
      simRole
    );
  }, [simAchieved, simTarget, simAttendance, simEscalation, config, simRole]);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Incentive Rules Configuration
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
              v{config.version || 1} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure base daily payouts, tiered performance slabs, QA escalation rules, and role overrides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfig}
            disabled={isLoading || isSaving}
            className="p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Reload from server"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Grid: 2 Columns for Form & Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rules Form (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Section 1: Core Base & Threshold */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-500" />
                1. Core Daily Payout & Target Threshold
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Effective: {config.effectiveDate}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Base Daily Incentive (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={config.baseDailyIncentive}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        baseDailyIncentive: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Awarded upon reaching 100% threshold</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Qualification Threshold (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={config.targetThresholdPct}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        targetThresholdPct: parseFloat(e.target.value) || 100,
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Minimum target achievement needed</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Rule Effective From Date
                </label>
                <input
                  type="date"
                  value={config.effectiveDate}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, effectiveDate: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-cyan-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Protects historical shift records</p>
              </div>
            </div>
          </div>

          {/* Section 2: Tiered Performance Slabs */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  2. Tiered Performance Accelerators (Slabs)
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Extra incentive awarded per point above target achievement across performance bands
                </p>
              </div>
              <button
                onClick={handleAddSlab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {config.tieredSlabs.map((slab, idx) => (
                <div
                  key={slab.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2.5 w-full">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tier Name</label>
                      <input
                        type="text"
                        value={slab.name}
                        onChange={(e) => handleUpdateSlab(idx, { name: e.target.value })}
                        className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Range Min %</label>
                      <input
                        type="number"
                        min={0}
                        value={slab.minPct}
                        onChange={(e) =>
                          handleUpdateSlab(idx, { minPct: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Range Max % (or Uncapped)</label>
                      <input
                        type="text"
                        placeholder="No Cap"
                        value={slab.maxPct === null ? "" : slab.maxPct}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          handleUpdateSlab(idx, { maxPct: val === "" ? null : parseFloat(val) || null });
                        }}
                        className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Rate / Point (₹)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={slab.ratePerPoint}
                          onChange={(e) =>
                            handleUpdateSlab(idx, { ratePerPoint: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full pl-6 pr-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSlab(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="Remove Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: QA Escalation & Attendance Compliance */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
            <div className="pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                3. QA Escalation & Attendance Eligibility Rules
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* QA Escalation Policy */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    QA Escalation Zero-Out
                  </span>
                  <input
                    type="checkbox"
                    checked={config.qaPolicy.zeroOutIncentive}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        qaPolicy: { ...prev.qaPolicy, zeroOutIncentive: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-cyan-600 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  When enabled, any active QA escalation ticket immediately zeroes out the day's entire incentive.
                </p>

                {!config.qaPolicy.zeroOutIncentive && (
                  <div className="mt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Fixed Penalty Deduction (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={config.qaPolicy.fixedDeductionPerEscalation}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          qaPolicy: {
                            ...prev.qaPolicy,
                            fixedDeductionPerEscalation: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full mt-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-rose-600"
                    />
                  </div>
                )}
              </div>

              {/* Attendance Policy */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Disqualify Absent Agents
                  </span>
                  <input
                    type="checkbox"
                    checked={config.disqualifyAbsent}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, disqualifyAbsent: e.target.checked }))
                    }
                    className="w-4 h-4 accent-cyan-600 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Agents marked Absent or Unapproved Leave receive ₹0 regardless of leads scored.
                </p>

                <div className="mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Allowed Attendance Statuses
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Present", "Full Day", "Half Day", "In Progress"].map((status) => {
                      const active = config.allowedAttendanceStatuses.includes(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setConfig((prev) => {
                              const exists = prev.allowedAttendanceStatuses.includes(status);
                              return {
                                ...prev,
                                allowedAttendanceStatuses: exists
                                  ? prev.allowedAttendanceStatuses.filter((s) => s !== status)
                                  : [...prev.allowedAttendanceStatuses, status],
                              };
                            });
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            active
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : "bg-slate-200/50 dark:bg-slate-800 text-slate-400 border-transparent line-through"
                          }`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Role & Department Overrides */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-500" />
                  4. Role & Department Overrides
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure special base rates or bonus multipliers for high-tier roles or strategic teams
                </p>
              </div>
              <button
                onClick={handleAddOverride}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Override</span>
              </button>
            </div>

            {config.overrides.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No custom overrides configured. Global rules apply to all roles and departments.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {config.overrides.map((override, idx) => (
                  <div
                    key={override.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2.5 w-full">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Target Type</label>
                        <select
                          value={override.targetType}
                          onChange={(e) =>
                            handleUpdateOverride(idx, {
                              targetType: e.target.value as "role" | "department" | "agent",
                            })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                        >
                          <option value="role">Role</option>
                          <option value="department">Department</option>
                          <option value="agent">Agent ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Identifier</label>
                        <input
                          type="text"
                          value={override.targetIdentifier}
                          onChange={(e) =>
                            handleUpdateOverride(idx, { targetIdentifier: e.target.value })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Base Rate (₹)</label>
                        <input
                          type="number"
                          value={override.baseIncentiveOverride ?? 500}
                          onChange={(e) =>
                            handleUpdateOverride(idx, {
                              baseIncentiveOverride: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Accelerator Multiplier</label>
                        <input
                          type="number"
                          step={0.05}
                          min={0.5}
                          max={3.0}
                          value={override.multiplier ?? 1.0}
                          onChange={(e) =>
                            handleUpdateOverride(idx, {
                              multiplier: parseFloat(e.target.value) || 1.0,
                            })
                          }
                          className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateOverride(idx, { isActive: !override.isActive })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          override.isActive
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-slate-200/50 dark:bg-slate-800 text-slate-400 border-transparent"
                        }`}
                      >
                        {override.isActive ? "Active" : "Disabled"}
                      </button>

                      <button
                        onClick={() => handleRemoveOverride(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Real-Time Incentive Calculator & Simulator (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent flex flex-col gap-4 sticky top-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-500" />
                Live Rule Simulator
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Zap className="w-3 h-3" /> Real-time
              </span>
            </div>

            {/* Input Controls */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Target Points:</span>
                  <span className="font-mono">{simTarget.toFixed(1)} pts</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  step={0.5}
                  value={simTarget}
                  onChange={(e) => setSimTarget(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Achieved Points:</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                    {simAchieved.toFixed(1)} pts ({((simAchieved / simTarget) * 100).toFixed(0)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={35}
                  step={0.5}
                  value={simAchieved}
                  onChange={(e) => setSimAchieved(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Role</label>
                  <select
                    value={simRole}
                    onChange={(e) => setSimRole(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Senior SDR">Senior SDR</option>
                    <option value="SDR Agent">SDR Agent</option>
                    <option value="Inbound Agent">Inbound Agent</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Attendance</label>
                  <select
                    value={simAttendance}
                    onChange={(e) => setSimAttendance(e.target.value)}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Present">Present</option>
                    <option value="Full Day">Full Day</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Active QA Escalation
                </span>
                <input
                  type="checkbox"
                  checked={simEscalation}
                  onChange={(e) => setSimEscalation(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Breakdown Box */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col gap-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Simulated Total Payout
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    simResult.isEligible
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  }`}
                >
                  {simResult.isEligible ? "Eligible" : "Disqualified"}
                </span>
              </div>

              <div className="text-3xl font-bold font-mono text-amber-400">
                {formatINR(simResult.totalIncentive)}
              </div>

              <div className="text-[11px] text-slate-300 leading-tight">
                {simResult.eligibilityReason}
              </div>

              {/* Sub-breakdown */}
              <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Base Incentive:</span>
                  <span>{formatINR(simResult.baseIncentive)}</span>
                </div>

                {simResult.appliedSlabs.map((s) => (
                  <div key={s.slabId} className="flex justify-between text-purple-300 text-[11px]">
                    <span>
                      {s.slabName} ({s.extraPoints} pts):
                    </span>
                    <span>+{formatINR(s.subtotal)}</span>
                  </div>
                ))}

                {simResult.appliedOverride && (
                  <div className="flex justify-between text-cyan-300 text-[10px]">
                    <span>Applied Override ({simResult.appliedOverride.targetIdentifier}):</span>
                    <span>{simResult.appliedOverride.multiplier}x Multiplier</span>
                  </div>
                )}

                {simResult.qaDeduction > 0 && (
                  <div className="flex justify-between text-rose-400 text-[11px]">
                    <span>QA Penalty Deduction:</span>
                    <span>-{formatINR(simResult.qaDeduction)}</span>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Changes made in this form are immediately reflected in this sandbox simulator before saving.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
