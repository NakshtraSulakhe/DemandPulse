"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sliders,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  ArrowLeft,
  Shield,
  Layers,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface SlabRow {
  slabOrder: number;
  minimumCompletionPct: number;
  maximumCompletionPct: number | null;
  amountPerExtraPoint: number;
}

export default function NewPolicyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [policyCode, setPolicyCode] = useState("POL-PROD-2026");
  const [policyName, setPolicyName] = useState("Production Daily Achievement Incentive");
  const [currency, setCurrency] = useState("INR");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState("");

  // Rules State
  const [minimumTargetPct, setMinimumTargetPct] = useState(100);
  const [baseIncentiveAmount, setBaseIncentiveAmount] = useState(500);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [qaEscalationAction, setQaEscalationAction] = useState("disqualify");
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [maximumDailyIncentive, setMaximumDailyIncentive] = useState(5000);
  const [roundingMode, setRoundingMode] = useState("floor");

  // Tiered Slabs
  const [slabs, setSlabs] = useState<SlabRow[]>([
    { slabOrder: 1, minimumCompletionPct: 100, maximumCompletionPct: 120, amountPerExtraPoint: 50 },
    { slabOrder: 2, minimumCompletionPct: 120.001, maximumCompletionPct: 150, amountPerExtraPoint: 75 },
    { slabOrder: 3, minimumCompletionPct: 150.001, maximumCompletionPct: null, amountPerExtraPoint: 100 },
  ]);

  const handleAddSlab = () => {
    const nextOrder = slabs.length + 1;
    const lastSlab = slabs[slabs.length - 1];
    const newMin = lastSlab?.maximumCompletionPct ? lastSlab.maximumCompletionPct + 0.001 : 100 + nextOrder * 20;

    // If last slab was open-ended, close it first
    if (lastSlab && lastSlab.maximumCompletionPct === null) {
      lastSlab.maximumCompletionPct = lastSlab.minimumCompletionPct + 30;
    }

    setSlabs([
      ...slabs,
      {
        slabOrder: nextOrder,
        minimumCompletionPct: Number(newMin.toFixed(3)),
        maximumCompletionPct: null, // open-ended for newest slab
        amountPerExtraPoint: 50,
      },
    ]);
  };

  const handleRemoveSlab = (idx: number) => {
    const filtered = slabs.filter((_, i) => i !== idx);
    const reindexed = filtered.map((s, i) => ({ ...s, slabOrder: i + 1 }));
    setSlabs(reindexed);
  };

  const handleSlabChange = (idx: number, field: keyof SlabRow, value: any) => {
    const updated = [...slabs];
    updated[idx] = { ...updated[idx], [field]: value };
    setSlabs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        policyCode: policyCode.trim().toUpperCase(),
        policyName: policyName.trim(),
        currency,
        validFrom,
        validTo: validTo ? validTo : null,
        rules: {
          minimumTargetPct: Number(minimumTargetPct),
          baseIncentiveAmount: Number(baseIncentiveAmount),
          attendanceRequired,
          qaEscalationAction,
          penaltyAmount: Number(penaltyAmount),
          maximumDailyIncentive: maximumDailyIncentive ? Number(maximumDailyIncentive) : null,
          roundingMode,
        },
        slabs: slabs.map((s, idx) => ({
          slabOrder: idx + 1,
          minimumCompletionPct: Number(s.minimumCompletionPct),
          maximumCompletionPct: s.maximumCompletionPct !== null && s.maximumCompletionPct !== undefined ? Number(s.maximumCompletionPct) : null,
          amountPerExtraPoint: Number(s.amountPerExtraPoint),
        })),
      };

      const res = await fetch("/api/incentive-config/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create policy draft");
      }

      router.push(`/admin/incentive-config/policies/${json.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/incentive-config/policies"
              className="text-xs text-slate-500 hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Policies
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Create New Incentive Policy Draft
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Initial policies are created in <span className="font-semibold text-slate-700 dark:text-slate-300">Draft</span> status. They require operations manager approval before publishing to CRM.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/incentive-config/policies"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {submitting ? "Saving Draft..." : "Create Policy Draft"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: General Info & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Policy Identification */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              1. Policy Identification & Effective Scope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Code (Uppercase Alphanumeric)
                </label>
                <input
                  type="text"
                  required
                  value={policyCode}
                  onChange={(e) => setPolicyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  placeholder="e.g. POL-PROD-2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Unique policy identifier code</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Descriptive Name
                </label>
                <input
                  type="text"
                  required
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Daily Target Achievement Tier Policy"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid From (Work Date)
                </label>
                <input
                  type="date"
                  required
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid To (Optional End Date)
                </label>
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  placeholder="Leave empty for indefinite"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Core Financial Threshold Rules */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              2. Core Financial Rules & Target Thresholds
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Min. Target Threshold (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={minimumTargetPct}
                  onChange={(e) => setMinimumTargetPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Default: 100% of daily quota</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base Daily Incentive (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={baseIncentiveAmount}
                  onChange={(e) => setBaseIncentiveAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Standard base incentive at 100%</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Max Daily Incentive Cap (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  value={maximumDailyIncentive}
                  onChange={(e) => setMaximumDailyIncentive(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Safety maximum payout limit</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  QA Audit Escalation Action
                </label>
                <select
                  value={qaEscalationAction}
                  onChange={(e) => setQaEscalationAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="disqualify">Disqualify (Zero Out Day)</option>
                  <option value="zero_out">Zero Out (No Incentive)</option>
                  <option value="penalty">Apply Penalty Amount</option>
                  <option value="none">Ignore (No Action)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Penalty Amount (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(parseFloat(e.target.value) || 0)}
                  disabled={qaEscalationAction !== "penalty"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs disabled:opacity-40 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rounding Mode
                </label>
                <select
                  value={roundingMode}
                  onChange={(e) => setRoundingMode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="floor">Floor (Standard)</option>
                  <option value="round">Round to Nearest</option>
                  <option value="ceil">Ceiling</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={attendanceRequired}
                  onChange={(e) => setAttendanceRequired(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Require Verified Shift Attendance Record in CRM for Payout Eligibility
              </label>
            </div>
          </div>

          {/* Section 3: Dynamic Tiered Slabs Builder */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  3. Tiered Incentive Slabs (Over-Achievement)
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure extra incentive earned per point/percent above the base target.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSlab}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {slabs.map((slab, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center gap-3 text-xs"
                >
                  <div className="w-16 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">
                      {slab.slabOrder}
                    </span>
                    <span>Tier {slab.slabOrder}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-full">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Min %</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={slab.minimumCompletionPct}
                        onChange={(e) => handleSlabChange(idx, "minimumCompletionPct", parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-mono text-xs focus:outline-none"
                      />
                    </div>

                    <span className="text-slate-400 self-end pb-2">to</span>

                    <div className="w-full">
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Max % {idx === slabs.length - 1 && "(or Open-Ended)"}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.001"
                          disabled={slab.maximumCompletionPct === null}
                          value={slab.maximumCompletionPct === null ? "" : slab.maximumCompletionPct}
                          placeholder="No upper limit"
                          onChange={(e) =>
                            handleSlabChange(
                              idx,
                              "maximumCompletionPct",
                              e.target.value === "" ? null : parseFloat(e.target.value)
                            )
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-mono text-xs disabled:opacity-50 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="w-full">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Amount / Extra Point (₹)</label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={slab.amountPerExtraPoint}
                        onChange={(e) => handleSlabChange(idx, "amountPerExtraPoint", parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 font-bold text-emerald-600 dark:text-emerald-400 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {idx === slabs.length - 1 && (
                    <label className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap self-end pb-2">
                      <input
                        type="checkbox"
                        checked={slab.maximumCompletionPct === null}
                        onChange={(e) =>
                          handleSlabChange(idx, "maximumCompletionPct", e.target.checked ? null : 150)
                        }
                        className="rounded border-slate-300 text-cyan-600"
                      />
                      Open-Ended
                    </label>
                  )}

                  {slabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors self-end pb-2"
                      title="Remove Tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Safeguards & Preview */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              Policy Versioning Safeguards
            </h3>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
              <li>
                This will create <strong className="text-slate-800 dark:text-slate-200">Version 1</strong> of{" "}
                <code className="font-mono text-emerald-500">{policyCode || "POL"}</code>.
              </li>
              <li>
                New policies must be submitted for <strong>Manager Review & Approval</strong> before publication.
              </li>
              <li>
                Once approved, future updates to financial amounts or slabs will automatically create a{" "}
                <strong>new draft version</strong> (v2, v3, etc.), preventing retroactive alteration of historical audit terms.
              </li>
              <li>
                Activation requires upstream DemandFlow Bridge CRM confirmation.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
}
