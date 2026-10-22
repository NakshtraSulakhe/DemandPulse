"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Globe,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";
import { useShiftConfig, useShiftEngine } from "@/hooks/useShiftEngine";
import { ShiftConfiguration } from "@/types/shift";

export default function ShiftManagementAdminPage() {
  const { data: configData, refetch: refetchConfig, isLoading: isLoadingConfig } = useShiftConfig();
  const shiftEngine = useShiftEngine(5000);

  const [form, setForm] = useState<Partial<ShiftConfiguration>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Simulation test state
  const [testTimeInput, setTestTimeInput] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (configData?.data) {
      setForm(configData.data);
    }
  }, [configData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/shifts/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to update shift (HTTP ${res.status})`);
      }

      setSaveStatus({
        type: "success",
        message: `Shift configuration updated successfully (v${json.data?.version || 1})!`,
      });
      refetchConfig();
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration";
      setSaveStatus({ type: "error", message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!testTimeInput) return;
    setIsTesting(true);
    try {
      const res = await fetch(`/api/shifts/current?timestamp=${encodeURIComponent(testTimeInput)}`);
      const json = await res.json();
      setTestResult(json.data);
    } catch {
      setTestResult(null);
    } finally {
      setIsTesting(false);
    }
  };

  const state = shiftEngine.shiftState;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Centralized Shift &amp; Operating Hours Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative US business shift schedule (5:30 PM – 2:30 AM IST) governing lead tagging, analytics, and incentives
          </p>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 border ${
            saveStatus.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Live Active Shift Status Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  shiftEngine.isShiftActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              Live Operating Shift Status:{" "}
              <span className="uppercase text-cyan-600 dark:text-cyan-400 font-extrabold">
                {state?.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Active Shift Business Date:{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {shiftEngine.businessDate}
              </span>{" "}
              (No midnight reset; shift crosses midnight to 2:30 AM)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dual Time Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">IST:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {state?.currentIstTime || "—"}
                </span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">US ({state?.usTimezoneAbbr}):</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {state?.currentUsTime || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Progress Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Shift Progress: {state?.minutesIntoShift || 0} / 540 min elapsed ({state?.percentElapsed || 0}%)
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
              Remaining: {state?.remainingMinutes || 0} min
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${state?.percentElapsed || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Timezone Schedule + Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shift Configuration Form (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Operational Shift Parameters
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Adjust operating hours, primary timezones, grace windows, and reporting targets
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              Version: {form.version || 1}
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Shift Name</label>
                <input
                  type="text"
                  value={form.shiftName || ""}
                  onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Shift Code</label>
                <input
                  type="text"
                  value={form.shiftCode || ""}
                  onChange={(e) => setForm({ ...form, shiftCode: e.target.value })}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Shift Start Time (IST)
                </label>
                <input
                  type="text"
                  value={form.startTime || "17:30:00"}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  placeholder="17:30:00"
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono font-bold text-cyan-600 dark:text-cyan-400"
                />
                <span className="text-[10px] text-slate-400">Fixed 5:30 PM India Standard Time</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Shift End Time (IST Next Day)
                </label>
                <input
                  type="text"
                  value={form.endTime || "02:30:00"}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  placeholder="02:30:00"
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono font-bold text-amber-600 dark:text-amber-400"
                />
                <span className="text-[10px] text-slate-400">Fixed 2:30 AM IST (Overnight conclusion)</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Primary Timezone
                </label>
                <input
                  type="text"
                  value={form.timezone || "Asia/Kolkata"}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  US Reporting Timezone
                </label>
                <input
                  type="text"
                  value={form.reportingTimezone || "America/New_York"}
                  onChange={(e) => setForm({ ...form, reportingTimezone: e.target.value })}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Punch-In Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  value={form.gracePeriodMinutes || 15}
                  onChange={(e) => setForm({ ...form, gracePeriodMinutes: Number(e.target.value) })}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Business Date Mapping Rule
                </label>
                <input
                  type="text"
                  value={form.businessDateRule || "SHIFT_START_DATE"}
                  disabled
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 text-slate-500 outline-none font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-200 text-[11px] leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Overnight Shift Policy: </strong>
                Because this shift crosses midnight, all leads, points, attendance logs, and QA audits created after 12:00 AM IST but prior to 2:30 AM IST automatically associate with the shift start date.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving Configuration..." : "Save Shift Configuration"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Timezone Schedule & Interactive Boundary Simulator (1 col) */}
        <div className="flex flex-col gap-5">
          {/* Timezone Conversion Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-500" />
              Dual-Timezone Operation Schedule
            </h3>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Fixed India Shift (Asia/Kolkata)
                </div>
                <div className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                  5:30 PM – 2:30 AM IST
                </div>
                <div className="text-[10px] text-slate-500">
                  Constant year-round; never changes for Daylight Saving Time.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  US Daylight Saving (EDT, Mar – Nov)
                </div>
                <div className="font-mono text-amber-600 dark:text-amber-400 font-bold text-sm">
                  8:00 AM – 5:00 PM EDT
                </div>
                <div className="text-[10px] text-slate-500">
                  Eastern Daylight Time (UTC-04:00)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 flex flex-col gap-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  US Standard Time (EST, Nov – Mar)
                </div>
                <div className="font-mono text-amber-600 dark:text-amber-400 font-bold text-sm">
                  7:00 AM – 4:00 PM EST
                </div>
                <div className="text-[10px] text-slate-500">
                  Eastern Standard Time (UTC-05:00)
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Shift Boundary Simulator */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-3.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Shift Boundary &amp; Date Simulator
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Input any timestamp to verify how the centralized engine assigns the business date.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="2026-10-23T01:30:00Z"
                value={testTimeInput}
                onChange={(e) => setTestTimeInput(e.target.value)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono flex-1 outline-none"
              />
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isTesting}
                className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
              >
                Test
              </button>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs flex flex-col gap-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Business Date:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {testResult.businessDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Shift Active:</span>
                  <span className="font-bold">{testResult.isShiftActive ? "YES" : "NO"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">IST Time:</span>
                  <span className="font-mono">{testResult.currentIstFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">US Time:</span>
                  <span className="font-mono">{testResult.currentUsFormatted}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
