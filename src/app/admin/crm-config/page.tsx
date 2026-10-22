"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Sliders,
  Shield,
  Key,
  Clock,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Radio,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Activity,
  Check,
  Copy,
  Pause,
  Play,
} from "lucide-react";
import { useCrmConfig } from "@/hooks/use-crm-config";
import { CrmConfig } from "@/types/crm-config";
import { formatIntervalDisplay } from "@/lib/utils";

interface IntervalCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  valueSeconds: number;
  onChange: (val: number) => void;
  accent: "cyan" | "amber" | "purple" | "emerald";
  presets: { label: string; seconds: number }[];
  minSeconds?: number;
  maxSeconds?: number;
  footerRateType?: "rate" | "cadence";
  children?: React.ReactNode;
}

function IntervalCard({
  title,
  icon,
  description,
  valueSeconds,
  onChange,
  accent,
  presets,
  minSeconds = 5,
  maxSeconds = 3600,
  footerRateType = "rate",
  children,
}: IntervalCardProps) {
  const [unit, setUnit] = useState<"sec" | "min">(() =>
    valueSeconds >= 60 && valueSeconds % 30 === 0 ? "min" : "sec"
  );
  const [inputValue, setInputValue] = useState<string>(() =>
    unit === "min" ? String(Number((valueSeconds / 60).toFixed(2))) : String(valueSeconds)
  );

  useEffect(() => {
    if (unit === "min") {
      setInputValue(String(Number((valueSeconds / 60).toFixed(2))));
    } else {
      setInputValue(String(valueSeconds));
    }
  }, [valueSeconds, unit]);

  const handleUnitToggle = (newUnit: "sec" | "min") => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === "min") {
      setInputValue(String(Number((valueSeconds / 60).toFixed(2))));
    } else {
      setInputValue(String(valueSeconds));
    }
  };

  const handleInputChange = (raw: string) => {
    setInputValue(raw);
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) return;

    let computedSec = unit === "min" ? Math.round(parsed * 60) : Math.round(parsed);
    computedSec = Math.max(minSeconds, Math.min(maxSeconds, computedSec));
    onChange(computedSec);
  };

  const colors = {
    cyan: {
      text: "text-cyan-700 dark:text-cyan-400",
      badge: "text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
      presetActive: "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 font-bold shadow-sm",
      unitActive: "bg-cyan-600 dark:bg-cyan-500 text-white font-bold shadow-sm",
      borderFocus: "focus:border-cyan-500",
    },
    amber: {
      text: "text-amber-700 dark:text-amber-400",
      badge: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
      presetActive: "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 font-bold shadow-sm",
      unitActive: "bg-amber-600 dark:bg-amber-500 text-white font-bold shadow-sm",
      borderFocus: "focus:border-amber-500",
    },
    purple: {
      text: "text-purple-700 dark:text-purple-400",
      badge: "text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/30",
      presetActive: "bg-purple-500/20 border-purple-500 text-purple-800 dark:text-purple-300 font-bold shadow-sm",
      unitActive: "bg-purple-600 dark:bg-purple-500 text-white font-bold shadow-sm",
      borderFocus: "focus:border-purple-500",
    },
    emerald: {
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
      presetActive: "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-sm",
      unitActive: "bg-emerald-600 dark:bg-emerald-500 text-white font-bold shadow-sm",
      borderFocus: "focus:border-emerald-500",
    },
  }[accent];

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className={`flex items-center gap-2 ${colors.text} text-xs font-bold`}>
            {icon}
            <span>{title}</span>
          </div>
          <span className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg border ${colors.badge}`}>
            {formatIntervalDisplay(valueSeconds)}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3.5 leading-relaxed">
          {description}
        </p>

        {/* Quick Presets */}
        <div className="mb-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">
            Quick Presets:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((p) => (
              <button
                key={p.seconds}
                type="button"
                onClick={() => onChange(p.seconds)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  valueSeconds === p.seconds
                    ? colors.presetActive
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input with Seconds / Minutes Toggle */}
        <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Custom Duration:
              </span>
              <span className="text-[10px] text-slate-500 block">
                Configure in exact seconds or minutes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step={unit === "min" ? "0.1" : "1"}
                min={unit === "min" ? "0.1" : String(minSeconds)}
                max={unit === "min" ? String(maxSeconds / 60) : String(maxSeconds)}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`w-20 px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:outline-none ${colors.borderFocus}`}
                placeholder={unit === "min" ? "min" : "sec"}
              />

              {/* Unit Toggle: Seconds / Minutes */}
              <div className="flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleUnitToggle("sec")}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    unit === "sec"
                      ? colors.unitActive
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Sec (s)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitToggle("min")}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    unit === "min"
                      ? colors.unitActive
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Min (m)
                </button>
              </div>
            </div>
          </div>
        </div>

        {children}
      </div>

      <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500">
        {footerRateType === "rate" ? (
          <>
            <span>Estimated request rate:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              ~{Math.round(3600 / (valueSeconds || 30))} queries / hr per active client
            </span>
          </>
        ) : (
          <>
            <span>Configured cadence:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {formatIntervalDisplay(valueSeconds)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const QUICK_PRESETS = [
  {
    name: "Local Apache / XAMPP",
    url: "http://localhost/demandflowbridge/api/v1",
    desc: "Default local development stack",
  },
  {
    name: "Localhost Loopback",
    url: "http://127.0.0.1/demandflowbridge/api/v1",
    desc: "Direct loopback without DNS resolution",
  },
  {
    name: "LAN Bridge Server",
    url: "http://192.168.1.100/demandflowbridge/api/v1",
    desc: "Dedicated internal operations server",
  },
];

export default function CrmConfigPage() {
  const {
    config,
    isLoading,
    isSaving,
    isTesting,
    isResetting,
    testReport,
    updateConfig,
    testConnection,
    resetConfig,
    triggerInstantSync,
  } = useCrmConfig();

  // Local form state
  const [formData, setFormData] = useState<CrmConfig>(config);
  const [showToken, setShowToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"sync" | "api" | "diagnostics" | "all">("sync");

  // Keep form updated when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = <K extends keyof CrmConfig>(key: K, value: CrmConfig[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setFormDirty(true);
  };

  const handleToggleAutoSync = async () => {
    try {
      const nextState = !formData.autoSyncEnabled;
      const updated = await updateConfig({ ...formData, autoSyncEnabled: nextState });
      setFormData(updated);
      setSyncStatusMessage(
        nextState
          ? `Auto-sync resumed! Live polling active every ${formatIntervalDisplay(updated.analyticsSyncInterval)}.`
          : "Auto-sync paused! Automated CRM API polling halted across all dashboards and slides."
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle auto-sync");
    }
  };

  const handleSave = async () => {
    try {
      await updateConfig(formData);
      setSaveSuccess(true);
      setFormDirty(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save configuration");
    }
  };

  const handleTest = async () => {
    try {
      await testConnection({
        baseUrl: formData.crmApiBaseUrl,
        token: formData.crmApiToken,
        timeoutMs: formData.crmApiTimeoutMs,
      });
      setActiveTab("diagnostics");
    } catch {
      setActiveTab("diagnostics");
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all CRM and sync intervals back to environment defaults?")) {
      await resetConfig();
      setFormDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleInstantSync = async () => {
    await triggerInstantSync();
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (isLoading && !config) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <span className="text-xs text-slate-500 font-semibold tracking-wide">Loading CRM Configuration...</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn max-w-[1750px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[11px] font-semibold border border-cyan-500/30 mb-1.5">
            <Server className="w-3 h-3 text-cyan-500" />
            DemandFlow Bridge Integration Console
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            CRM API & Sync Interval Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure upstream REST endpoints, bearer authentication tokens, dynamic background polling cadences, and failover options for presentation displays.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* 1-Click Pause / Resume Auto-Sync Button */}
          <button
            onClick={handleToggleAutoSync}
            disabled={isSaving}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 ${
              formData.autoSyncEnabled
                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30"
                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 animate-pulse"
            }`}
            title={
              formData.autoSyncEnabled
                ? "Click to immediately pause all background CRM API polling"
                : "Click to resume automatic background CRM API polling"
            }
          >
            {formData.autoSyncEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/30" />
                <span>Pause API Sync</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-500/30" />
                <span>Resume API Sync</span>
              </>
            )}
          </button>

          <button
            onClick={handleInstantSync}
            disabled={syncSuccess}
            className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            title="Forces all active queries across dashboards to refresh immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncSuccess ? "text-emerald-500 animate-spin" : "text-cyan-500"}`} />
            <span>{syncSuccess ? "Synced!" : "Force Sync Now"}</span>
          </button>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-cyan-400" : "text-cyan-500"}`} />
            <span>{isTesting ? "Testing Upstream..." : "Test CRM Connection"}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg transition-all flex items-center gap-2 cursor-pointer border ${
              formDirty
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/40 shadow-emerald-600/25 animate-pulse"
                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-cyan-400/30 shadow-cyan-600/20"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : formDirty ? "Save Changes *" : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl text-xs bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-400/50 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{syncStatusMessage || "CRM API configuration and sync intervals updated successfully! All active slides and dashboard components have adjusted to the new schedule."}</span>
          </div>
        </div>
      )}

      {syncSuccess && (
        <div className="p-3 rounded-xl text-xs bg-cyan-100/90 dark:bg-cyan-950/60 border border-cyan-400/50 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-200 flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <span>Instant sync completed! Slide 1–5 caches, campaign targets, and celebration scrollers refetched.</span>
        </div>
      )}

      {/* Quick Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Upstream Base Endpoint
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={formData.crmApiBaseUrl}>
                {formData.crmApiBaseUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={() => copyToClipboard(formData.crmApiBaseUrl)}
                className="text-slate-400 hover:text-cyan-500 transition-colors p-0.5"
                title="Copy CRM Base URL"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("sync")}
          className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
          title="Click to view and configure sync timing intervals"
        >
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Auto-Sync Cadence
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {formData.autoSyncEnabled ? `Every ${formatIntervalDisplay(formData.analyticsSyncInterval)}` : "Paused"}
            </span>
            <span className="text-[10px] text-slate-500">
              {formData.autoSyncEnabled ? `~${Math.round(3600 / (formData.analyticsSyncInterval || 30))} queries/hr` : "Polling inactive"}
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${formData.autoSyncEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
            <Radio className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Failover Mode
            </span>
            <span className={`text-xs font-bold block mt-0.5 ${formData.crmMockFallback ? "text-amber-600 dark:text-amber-400" : "text-cyan-600 dark:text-cyan-400"}`}>
              {formData.crmMockFallback ? "Mock Fallback ON" : "Live API Direct"}
            </span>
            <span className="text-[10px] text-slate-500">
              {formData.crmMockFallback ? "Guaranteed offline demo" : "Strict CRM requirement"}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Upstream Latency
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {testReport ? `${testReport.averageLatencyMs}ms avg` : "Not Tested Yet"}
            </span>
            <span className={`text-[10px] font-semibold ${
              testReport?.overallStatus === "healthy"
                ? "text-emerald-600 dark:text-emerald-400"
                : testReport?.overallStatus === "degraded"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500"
            }`}>
              {testReport?.overallStatus ? testReport.overallStatus.toUpperCase() : "Ready to probe"}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200/80 dark:border-white/10 gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab("sync")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "sync"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4 text-cyan-500" />
          <span>API Sync Intervals & Cadence (Time Configuration)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {formatIntervalDisplay(formData.analyticsSyncInterval)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("api")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "api"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>CRM REST API Connection</span>
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "diagnostics"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Endpoint Diagnostics</span>
          {testReport && (
            <span className={`w-2 h-2 rounded-full ${testReport.ok ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
          )}
        </button>

        <button
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "all"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Settings (Full Overview)</span>
        </button>
      </div>      {/* SECTION 1: API Sync Intervals & Cadence (Time Configuration) */}
      {(activeTab === "sync" || activeTab === "all") && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {activeTab === "all" && (
            <div className="flex items-center gap-2 pt-2 border-b border-slate-200/60 dark:border-white/10 pb-2">
              <Clock className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">1. API Sync Intervals & Timing Cadence</h2>
            </div>
          )}

          {/* Master Auto-Sync Switch */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl border ${formData.autoSyncEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"}`}>
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Automated Background Synchronization
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  When enabled, all client screens, dashboard cards, and TV presentations automatically poll the CRM API at the configured intervals below.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                formData.autoSyncEnabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}>
                {formData.autoSyncEnabled ? "POLLING ACTIVE" : "POLLING PAUSED"}
              </span>

              <button
                type="button"
                onClick={handleToggleAutoSync}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.autoSyncEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
                title={formData.autoSyncEnabled ? "Click to pause auto-sync" : "Click to resume auto-sync"}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.autoSyncEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sync Intervals Grid - Responsive Widescreen */}
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-5">
            {/* 1. Analytics Polling Refresh Interval */}
            <IntervalCard
              title="Live Slides Analytics Poll Interval"
              icon={<Activity className="w-4 h-4 text-cyan-500" />}
              description="Cadence for refetching Slide 1 (KPIs & Campaigns), Slide 2 (SDR points), Slide 3 & 4 (heatmaps), and Slide 5 (comparative)."
              valueSeconds={formData.analyticsSyncInterval || 30}
              onChange={(val) => handleChange("analyticsSyncInterval", val)}
              accent="cyan"
              presets={[
                { label: "10s", seconds: 10 },
                { label: "15s", seconds: 15 },
                { label: "20s", seconds: 20 },
                { label: "30s", seconds: 30 },
                { label: "45s", seconds: 45 },
                { label: "1 min", seconds: 60 },
                { label: "2 min", seconds: 120 },
                { label: "5 min", seconds: 300 },
                { label: "10 min", seconds: 600 },
              ]}
              footerRateType="rate"
            />

            {/* 2. Live Recognition & Celebrations Scroller Interval */}
            <IntervalCard
              title="Recognition & Celebrations Ticker Poll"
              icon={<Sparkles className="w-4 h-4 text-amber-500" />}
              description="Frequency for syncing top lead scores, birthdays, and work anniversaries on the global scrolling ribbon."
              valueSeconds={formData.recognitionSyncInterval || 20}
              onChange={(val) => handleChange("recognitionSyncInterval", val)}
              accent="amber"
              presets={[
                { label: "10s", seconds: 10 },
                { label: "15s", seconds: 15 },
                { label: "20s", seconds: 20 },
                { label: "30s", seconds: 30 },
                { label: "45s", seconds: 45 },
                { label: "1 min", seconds: 60 },
                { label: "2 min", seconds: 120 },
                { label: "5 min", seconds: 300 },
              ]}
              footerRateType="rate"
            >
              <div className="pt-2.5 border-t border-slate-200/60 dark:border-white/5 mb-1">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5 uppercase tracking-wider">
                  Celebration Milestones Filter:
                </span>
                <div className="flex gap-1.5">
                  {[
                    { id: "daily", label: "Daily (Today Only)" },
                    { id: "weekly", label: "This Week" },
                    { id: "monthly", label: "This Month" },
                  ].map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => handleChange("recognitionDisplayScope", scope.id as any)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        (formData.recognitionDisplayScope || "daily") === scope.id
                          ? "bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>
              </div>
            </IntervalCard>

            {/* 3. Campaign Targets Polling Interval */}
            <IntervalCard
              title="Campaign Daily Targets Sync Cadence"
              icon={<Database className="w-4 h-4 text-purple-500" />}
              description="Interval for checking database campaign allocations, remaining targets to qualify, and lead counts."
              valueSeconds={formData.campaignTargetsSyncInterval || 30}
              onChange={(val) => handleChange("campaignTargetsSyncInterval", val)}
              accent="purple"
              presets={[
                { label: "15s", seconds: 15 },
                { label: "30s", seconds: 30 },
                { label: "45s", seconds: 45 },
                { label: "1 min", seconds: 60 },
                { label: "2 min", seconds: 120 },
                { label: "5 min", seconds: 300 },
                { label: "10 min", seconds: 600 },
              ]}
              footerRateType="cadence"
            />

            {/* 4. Automated TV Slide Rotation Interval */}
            <IntervalCard
              title="TV Slide Carousel Rotation Timer"
              icon={<Clock className="w-4 h-4 text-emerald-500" />}
              description="Seconds or minutes each slide stays visible before automatically advancing to the next active slide in TV presentation mode."
              valueSeconds={formData.slideRotationInterval || 25}
              onChange={(val) => handleChange("slideRotationInterval", val)}
              accent="emerald"
              presets={[
                { label: "15s", seconds: 15 },
                { label: "20s", seconds: 20 },
                { label: "25s", seconds: 25 },
                { label: "30s", seconds: 30 },
                { label: "45s", seconds: 45 },
                { label: "1 min", seconds: 60 },
                { label: "2 min", seconds: 120 },
              ]}
              footerRateType="cadence"
            />
          </div>
        </div>
      )}

      {/* SECTION 2: CRM REST API Connection */}
      {(activeTab === "api" || activeTab === "all") && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {activeTab === "all" && (
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200/60 dark:border-white/10 pb-2">
              <Server className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">2. CRM REST API Connection & Upstream Endpoints</h2>
            </div>
          )}

          {/* Main Connection Parameters */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-sm font-bold mb-1">
                <Globe className="w-4 h-4" />
                <span>Primary CRM Bridge API Base URL</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Specify the HTTP root for your PHP DemandFlow CRM API. All slide analytics and target synchronization requests route through this address.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={formData.crmApiBaseUrl}
                    onChange={(e) => handleChange("crmApiBaseUrl", e.target.value)}
                    placeholder="http://localhost/demandflowbridge/api/v1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                  <span>Test URL</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Presets:</span>
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleChange("crmApiBaseUrl", preset.url)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                      formData.crmApiBaseUrl === preset.url
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                    title={preset.desc}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* CRM API Token */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-bold">
                  <Key className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Upstream CRM API Bearer Token / Secret (Optional)</span>
                </div>
                <span className="text-[10px] text-slate-400">Included as Authorization: Bearer &lt;TOKEN&gt;</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                If your CRM PHP server requires token-based authentication to query slide endpoints or write daily targets, enter it below.
              </p>

              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={formData.crmApiToken}
                  onChange={(e) => handleChange("crmApiToken", e.target.value)}
                  placeholder="Enter CRM API Token or secret key (leave blank if unauthenticated)"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Upstream Request Timeout */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-bold mb-1">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>Upstream Connection Timeout</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                Maximum time allowed for PHP queries (especially 10-minute heatmap aggregation) before failing over.
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  { ms: 5000, label: "5 Seconds (Fast LAN)" },
                  { ms: 15000, label: "15 Seconds (Normal)" },
                  { ms: 30000, label: "30 Seconds (Default)" },
                  { ms: 60000, label: "60 Seconds (Heavy Data)" },
                ].map((item) => (
                  <button
                    key={item.ms}
                    type="button"
                    onClick={() => handleChange("crmApiTimeoutMs", item.ms)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      formData.crmApiTimeoutMs === item.ms
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Intelligent Mock Fallback Switch */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Intelligent Mock / Offline Fallback Mode
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      When enabled, if the CRM PHP backend or MySQL database is unreachable or offline, the application seamlessly serves verified DemandFlow demonstration data across all 5 slides rather than displaying blank error panels. Ideal for executive presentations, rehearsals, and offline demos.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formData.crmMockFallback}
                    onChange={(e) => handleChange("crmMockFallback", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Upstream Endpoints Directory */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-cyan-500" />
              Calculated Upstream Endpoints Directory
            </h2>
            <p className="text-[11px] text-slate-500 mb-3">
              The Next.js backend transparently proxies the following CRM API endpoints based on your configured base URL:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {[
                { name: "Slide 1 Operations Overview", path: "/slides/slide1.php", fallback: "/slides_analytics.php?action=slide1" },
                { name: "Slide 2 Agent Productivity", path: "/slides/slide2.php", fallback: "/slides_analytics.php?action=slide2" },
                { name: "Slide 3 QA 10m Heatmap", path: "/slides/slide3.php", fallback: "/slides_analytics.php?action=slide3" },
                { name: "Slide 4 Agent 10m Heatmap", path: "/slides/slide4.php", fallback: "/slides_analytics.php?action=slide4" },
                { name: "Slide 5 Comparative Analysis", path: "/slides/slide5.php", fallback: "/slides_analytics.php?action=slide5" },
                { name: "Campaign Daily Targets", path: "/campaign_daily_targets.php", fallback: "Auto-creates schema" },
                { name: "Live Recognition & Ticker", path: "/slides/recognition.php", fallback: "/slides_analytics.php?action=recognition" },
              ].map((ep) => (
                <div key={ep.name} className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{ep.name}</div>
                  <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300 mt-1 truncate" title={`${formData.crmApiBaseUrl}${ep.path}`}>
                    {formData.crmApiBaseUrl.replace(/\/+$/, "")}{ep.path}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Live Endpoint Diagnostics */}
      {(activeTab === "diagnostics" || activeTab === "all") && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {activeTab === "all" && (
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200/60 dark:border-white/10 pb-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Live Endpoint Diagnostics & Health Probe</h2>
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500" />
                  Upstream CRM Endpoints Health Probe
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Probes each individual DemandFlow PHP slide endpoint directly from the server to measure round-trip latency and HTTP compliance.
                </p>
              </div>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`} />
                <span>{isTesting ? "Probing Endpoints..." : "Run Diagnostics Now"}</span>
              </button>
            </div>

            {testReport ? (
              <div className="flex flex-col gap-4 mt-2">
                {/* Overall Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  testReport.overallStatus === "healthy"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : testReport.overallStatus === "degraded"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                }`}>
                  <div className="flex items-center gap-3">
                    {testReport.overallStatus === "healthy" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : testReport.overallStatus === "degraded" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide">
                        Status: {testReport.overallStatus} • {testReport.averageLatencyMs}ms Average Roundtrip
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">{testReport.message}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:block">
                    Tested at {new Date(testReport.testedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Detailed Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-2.5 px-4">Endpoint Name</th>
                        <th className="py-2.5 px-4">Relative Path</th>
                        <th className="py-2.5 px-4">HTTP Status</th>
                        <th className="py-2.5 px-4">Latency</th>
                        <th className="py-2.5 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {testReport.endpoints.map((ep) => (
                        <tr key={ep.name} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {ep.name}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-cyan-700 dark:text-cyan-300">
                            {ep.endpoint}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              ep.ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}>
                              {ep.ok ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {ep.status ? `HTTP ${ep.status}` : "Unreachable"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {ep.latencyMs}ms
                          </td>
                          <td className="py-2.5 px-4 text-[11px] text-slate-500">
                            {ep.error ? (
                              <span className="text-rose-600 dark:text-rose-400">{ep.error}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">Endpoint healthy & validated</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
                <Activity className="w-8 h-8 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">No diagnostic report generated yet</span>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Click &ldquo;Run Diagnostics Now&rdquo; to send real HTTP probes to all upstream CRM endpoints and test your configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persistent Configuration Footer */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-cyan-500 flex-shrink-0" />
          <span>
            Configuration is saved in <code className="font-mono text-cyan-700 dark:text-cyan-300">data/crm-config.json</code> and takes effect immediately without needing server restart.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
