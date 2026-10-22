"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Code2,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { useCrmConfig } from "@/hooks/use-crm-config";
import { CrmConfig, CrmCustomEndpoint, DEFAULT_CRM_ENDPOINTS } from "@/types/crm-config";
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
    name: "Taraj Global Live Hosted (Production)",
    url: "https://app.tarajglobal.com/demandflowbridge/api/v1",
    token: "df_admin_secret_token_2026",
    desc: "Official hosted cloud API with live production analytics and 51 campaigns",
  },
  {
    name: "Local Apache / XAMPP",
    url: "http://localhost/demandflowbridge/api/v1",
    token: "",
    desc: "Default local development stack",
  },
  {
    name: "Localhost Loopback",
    url: "http://127.0.0.1/demandflowbridge/api/v1",
    token: "",
    desc: "Direct loopback without DNS resolution",
  },
  {
    name: "LAN Bridge Server",
    url: "http://192.168.1.100/demandflowbridge/api/v1",
    token: "",
    desc: "Dedicated internal operations server",
  },
];

const ENDPOINT_TEMPLATES: Omit<CrmCustomEndpoint, "enabled">[] = [
  {
    id: "slides_analytics_master",
    name: "Consolidated Slides Master Analytics",
    path: "slides_analytics.php?type=slide1",
    fallbackPath: "slides_analytics.php",
    method: "GET",
    category: "presentation",
    description: "Consolidated live stream returning all 5 slides, agent metrics, and celebratory tickers",
    isBuiltIn: true,
  },
  {
    id: "agent_daily_incentives",
    name: "Daily Agent Incentive API",
    path: "agent_incentives.php",
    fallbackPath: "slides_analytics.php?type=slide2",
    method: "GET",
    category: "operations",
    description: "SDR commission calculations, tier milestones, and point accelerator bonuses",
    isBuiltIn: false,
  },
  {
    id: "lead_quality_matrix",
    name: "Lead Quality Inspection Feed",
    path: "lead_quality_matrix.php",
    fallbackPath: "slides/slide3.php",
    method: "GET",
    category: "operations",
    description: "Real-time QA acceptance rates, rejection tags, and auditor notes",
    isBuiltIn: false,
  },
  {
    id: "campaign_targets_writer",
    name: "Campaign Target Writer API",
    path: "campaign_daily_targets.php",
    fallbackPath: "",
    method: "POST",
    category: "targets",
    description: "Saves daily lead allocation targets and monthly quotas to MySQL database",
    isBuiltIn: false,
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
  const [copiedEndpointId, setCopiedEndpointId] = useState<string | null>(null);
  const [copiedProxyId, setCopiedProxyId] = useState<string | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"sync" | "api" | "endpoints" | "diagnostics" | "all">("sync");

  // Endpoint management state
  const [endpointSearch, setEndpointSearch] = useState("");
  const [endpointCategory, setEndpointCategory] = useState<"all" | "presentation" | "operations" | "targets" | "custom">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<CrmCustomEndpoint | null>(null);
  const [modalForm, setModalForm] = useState<{
    id: string;
    name: string;
    path: string;
    fallbackPath: string;
    method: "GET" | "POST";
    category: "presentation" | "operations" | "targets" | "custom";
    description: string;
    enabled: boolean;
  }>({
    id: "",
    name: "",
    path: "",
    fallbackPath: "",
    method: "GET",
    category: "custom",
    description: "",
    enabled: true,
  });

  // Single probe results
  const [probingEndpoints, setProbingEndpoints] = useState<Record<string, boolean>>({});
  const [probeResults, setProbeResults] = useState<Record<string, { ok: boolean; status: number; latencyMs: number; error?: string }>>({});

  // Active custom endpoints list
  const currentEndpoints: CrmCustomEndpoint[] = useMemo(() => {
    if (formData.customEndpoints && formData.customEndpoints.length > 0) {
      return formData.customEndpoints;
    }
    return DEFAULT_CRM_ENDPOINTS;
  }, [formData.customEndpoints]);

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
        endpoints: currentEndpoints,
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

  const getFullUpstreamUrl = (path: string) => {
    const cleanBase = (formData.crmApiBaseUrl || "").replace(/\/+$/, "");
    const cleanPath = (path || "").replace(/^\/+/, "");
    let full = cleanPath.startsWith("http://") || cleanPath.startsWith("https://")
      ? cleanPath
      : `${cleanBase}/${cleanPath}`;
    if (formData.crmApiToken && formData.crmApiToken.trim().length > 0) {
      try {
        const u = new URL(full);
        if (!u.searchParams.has("token")) {
          u.searchParams.set("token", formData.crmApiToken.trim());
          full = u.toString();
        }
      } catch {}
    }
    return full;
  };

  const copyEndpointUrl = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpointId(id);
    setTimeout(() => setCopiedEndpointId(null), 2000);
  };

  const copyProxyUrl = (id: string) => {
    if (typeof window !== "undefined") {
      const proxyUrl = `${window.location.origin}/api/crm/proxy?endpoint=${id}`;
      navigator.clipboard.writeText(proxyUrl);
      setCopiedProxyId(id);
      setTimeout(() => setCopiedProxyId(null), 2000);
    }
  };

  // Endpoint Modal Handlers
  const handleOpenAddModal = () => {
    setEditingEndpoint(null);
    setModalForm({
      id: `api_${Date.now().toString(36)}`,
      name: "",
      path: "",
      fallbackPath: "",
      method: "GET",
      category: "custom",
      description: "",
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ep: CrmCustomEndpoint) => {
    setEditingEndpoint(ep);
    setModalForm({
      id: ep.id,
      name: ep.name,
      path: ep.path,
      fallbackPath: ep.fallbackPath || "",
      method: ep.method || "GET",
      category: ep.category || "custom",
      description: ep.description || "",
      enabled: ep.enabled !== false,
    });
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (template: typeof ENDPOINT_TEMPLATES[number]) => {
    setModalForm((prev) => ({
      ...prev,
      name: template.name,
      path: template.path,
      fallbackPath: template.fallbackPath || "",
      method: template.method || "GET",
      category: template.category || "custom",
      description: template.description || "",
      id: editingEndpoint ? prev.id : `${template.id}_${Date.now().toString(36).slice(-4)}`,
    }));
  };

  const handleSaveModalEndpoint = () => {
    if (!modalForm.name.trim() || !modalForm.path.trim()) {
      alert("Please provide both an Endpoint Name and an Upstream Path.");
      return;
    }

    const cleanId = (modalForm.id.trim() || modalForm.name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_"));
    const updatedEndpoint: CrmCustomEndpoint = {
      id: cleanId,
      name: modalForm.name.trim(),
      path: modalForm.path.trim(),
      fallbackPath: modalForm.fallbackPath.trim() || undefined,
      method: modalForm.method,
      category: modalForm.category,
      description: modalForm.description.trim(),
      enabled: modalForm.enabled,
      isBuiltIn: editingEndpoint?.isBuiltIn || false,
    };

    const nextEndpoints = [...currentEndpoints];
    const existingIdx = nextEndpoints.findIndex(
      (e) => e.id === cleanId || (editingEndpoint && e.id === editingEndpoint.id)
    );

    if (existingIdx >= 0) {
      nextEndpoints[existingIdx] = updatedEndpoint;
    } else {
      nextEndpoints.push(updatedEndpoint);
    }

    const nextEndpointsMap = { ...(formData.endpoints || {}) };
    nextEndpointsMap[cleanId] = updatedEndpoint.path;

    setFormData((prev) => ({
      ...prev,
      customEndpoints: nextEndpoints,
      endpoints: nextEndpointsMap,
    }));
    setFormDirty(true);
    setIsModalOpen(false);
  };

  const handleDeleteEndpoint = (id: string) => {
    const ep = currentEndpoints.find((e) => e.id === id);
    if (ep?.isBuiltIn) {
      alert("Built-in core endpoints cannot be deleted as they are required by presentation dashboard slides. You can toggle them inactive instead.");
      return;
    }

    if (window.confirm(`Are you sure you want to remove the endpoint "${ep?.name || id}"?`)) {
      const nextEndpoints = currentEndpoints.filter((e) => e.id !== id);
      const nextEndpointsMap = { ...(formData.endpoints || {}) };
      delete nextEndpointsMap[id];

      setFormData((prev) => ({
        ...prev,
        customEndpoints: nextEndpoints,
        endpoints: nextEndpointsMap,
      }));
      setFormDirty(true);
    }
  };

  const handleToggleEndpointEnabled = (id: string) => {
    const nextEndpoints = currentEndpoints.map((e) =>
      e.id === id ? { ...e, enabled: e.enabled === false ? true : false } : e
    );
    setFormData((prev) => ({
      ...prev,
      customEndpoints: nextEndpoints,
    }));
    setFormDirty(true);
  };

  const handleInlinePathChange = (id: string, newPath: string) => {
    const nextEndpoints = currentEndpoints.map((e) =>
      e.id === id ? { ...e, path: newPath } : e
    );
    const nextEndpointsMap = { ...(formData.endpoints || {}) };
    nextEndpointsMap[id] = newPath;

    setFormData((prev) => ({
      ...prev,
      customEndpoints: nextEndpoints,
      endpoints: nextEndpointsMap,
    }));
    setFormDirty(true);
  };

  const handleResetEndpointsToDefault = () => {
    if (window.confirm("Reset all endpoints back to the default DemandFlow built-in routes? Any custom endpoints will be discarded.")) {
      const defaultMap: Record<string, string> = {};
      DEFAULT_CRM_ENDPOINTS.forEach((ep) => {
        defaultMap[ep.id] = ep.path;
      });
      setFormData((prev) => ({
        ...prev,
        customEndpoints: DEFAULT_CRM_ENDPOINTS,
        endpoints: defaultMap,
      }));
      setFormDirty(true);
    }
  };

  const handleSingleProbe = async (endpoint: CrmCustomEndpoint) => {
    setProbingEndpoints((prev) => ({ ...prev, [endpoint.id]: true }));
    try {
      const report = await testConnection({
        baseUrl: formData.crmApiBaseUrl,
        token: formData.crmApiToken,
        timeoutMs: formData.crmApiTimeoutMs,
        endpoints: [endpoint],
      });
      const res = report.endpoints.find(
        (e) => e.name === endpoint.name || e.endpoint === endpoint.path
      );
      if (res) {
        setProbeResults((prev) => ({
          ...prev,
          [endpoint.id]: {
            ok: res.ok,
            status: res.status,
            latencyMs: res.latencyMs,
            error: res.error,
          },
        }));
      } else {
        setProbeResults((prev) => ({
          ...prev,
          [endpoint.id]: {
            ok: report.ok,
            status: report.ok ? 200 : 500,
            latencyMs: report.averageLatencyMs,
          },
        }));
      }
    } catch (err: unknown) {
      setProbeResults((prev) => ({
        ...prev,
        [endpoint.id]: {
          ok: false,
          status: 0,
          latencyMs: 0,
          error: err instanceof Error ? err.message : "Connection failed",
        },
      }));
    } finally {
      setProbingEndpoints((prev) => ({ ...prev, [endpoint.id]: false }));
    }
  };

  // Filtered endpoints for display
  const filteredEndpoints = useMemo(() => {
    return currentEndpoints.filter((ep) => {
      const matchesCategory = endpointCategory === "all" || ep.category === endpointCategory;
      const matchesSearch =
        endpointSearch.trim() === "" ||
        ep.name.toLowerCase().includes(endpointSearch.toLowerCase()) ||
        ep.id.toLowerCase().includes(endpointSearch.toLowerCase()) ||
        ep.path.toLowerCase().includes(endpointSearch.toLowerCase()) ||
        (ep.description && ep.description.toLowerCase().includes(endpointSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [currentEndpoints, endpointCategory, endpointSearch]);

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

        <div
          onClick={() => setActiveTab("endpoints")}
          className="glass-panel p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
          title="Click to manage dynamic project API endpoints"
        >
          <div>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Registered API Endpoints
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {currentEndpoints.filter((e) => e.enabled !== false).length} Active / {currentEndpoints.length} Total
            </span>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
              Click to configure &amp; add APIs &rarr;
            </span>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Database className="w-4 h-4" />
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
          onClick={() => setActiveTab("endpoints")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "endpoints"
              ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 shadow-sm"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Database className="w-4 h-4 text-cyan-500" />
          <span>API Endpoints & Dynamic Routes</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {currentEndpoints.length} APIs
          </span>
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

          {/* Upstream Endpoints Summary Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-cyan-500" />
                Dynamic Upstream Endpoints Directory ({currentEndpoints.length} Registered)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
                Every slide, heatmap, ticker, and campaign target endpoint routes dynamically through these upstream paths. You can modify paths, add new custom project APIs, and test probes in the Endpoints tab.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("endpoints")}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Manage & Configure APIs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: API Endpoints & Dynamic Routes (Custom & Built-in) */}
      {(activeTab === "endpoints" || activeTab === "all") && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {activeTab === "all" && (
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200/60 dark:border-white/10 pb-2">
              <Database className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">3. API Endpoints & Dynamic Custom Routes</h2>
            </div>
          )}

          {/* Endpoints Management Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col gap-5">
            {/* Header with Title and Add Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-500" />
                    Project API Endpoints & Flexible Upstream Routes
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                    {currentEndpoints.filter((e) => e.enabled !== false).length} Active / {currentEndpoints.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Register new CRM API endpoints, modify upstream paths, customize fallback routes, and probe latency in real-time. Any API added here is instantly queryable by the dashboard and available via the universal Next.js proxy route <code className="font-mono text-cyan-700 dark:text-cyan-300 text-[10px]">/api/crm/proxy?endpoint=[id]</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetEndpointsToDefault}
                  className="px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Reset endpoints back to built-in defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Endpoints</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New API Endpoint</span>
                </button>
              </div>
            </div>

            {/* Quick Templates Bar */}
            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Quick Register Templates:
                </span>
                <span className="text-[11px] text-slate-500 hidden md:inline">
                  Click a template to pre-fill endpoint details
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {ENDPOINT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      handleOpenAddModal();
                      setTimeout(() => handleApplyTemplate(tmpl), 50);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-900 hover:bg-cyan-500/10 text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "All APIs", count: currentEndpoints.length },
                  { id: "presentation", label: "Presentation", count: currentEndpoints.filter((e) => e.category === "presentation").length },
                  { id: "operations", label: "Operations", count: currentEndpoints.filter((e) => e.category === "operations").length },
                  { id: "targets", label: "Targets & Quotas", count: currentEndpoints.filter((e) => e.category === "targets").length },
                  { id: "custom", label: "Custom Routes", count: currentEndpoints.filter((e) => e.category === "custom").length },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEndpointCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      endpointCategory === cat.id
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={endpointSearch}
                  onChange={(e) => setEndpointSearch(e.target.value)}
                  placeholder="Filter by name, ID, or path..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {endpointSearch && (
                  <button
                    type="button"
                    onClick={() => setEndpointSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Endpoints Table / Cards List */}
            <div className="flex flex-col gap-3">
              {filteredEndpoints.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    No endpoints match your search or filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEndpointSearch("");
                      setEndpointCategory("all");
                    }}
                    className="mt-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredEndpoints.map((ep) => {
                  const isProbing = probingEndpoints[ep.id];
                  const probeRes = probeResults[ep.id];
                  const fullUrl = getFullUpstreamUrl(ep.path);
                  const isCopiedFull = copiedEndpointId === ep.id;
                  const isCopiedProxy = copiedProxyId === ep.id;

                  const categoryBadges: Record<string, string> = {
                    presentation: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
                    operations: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                    targets: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
                    custom: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
                  };

                  return (
                    <div
                      key={ep.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                        ep.enabled === false
                          ? "bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-white/5 opacity-60"
                          : "bg-white dark:bg-slate-900/70 border-slate-200/90 dark:border-white/10 hover:border-cyan-500/40 shadow-xs"
                      }`}
                    >
                      {/* Top Row: Badges, Title, Enabled Switch, Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Method Badge */}
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase border ${
                            ep.method === "POST"
                              ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                          }`}>
                            {ep.method || "GET"}
                          </span>

                          {/* Category Badge */}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize border ${
                            categoryBadges[ep.category || "custom"] || categoryBadges.custom
                          }`}>
                            {ep.category || "custom"}
                          </span>

                          {/* Built-in vs Custom Badge */}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ep.isBuiltIn ? "• Built-in Route" : "• Custom API"}
                          </span>

                          {/* Endpoint ID Slug */}
                          <code className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
                            id: {ep.id}
                          </code>
                        </div>

                        {/* Right Actions: Enabled Toggle, Probe, Edit, Delete */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          {/* Probe Button */}
                          <button
                            type="button"
                            onClick={() => handleSingleProbe(ep)}
                            disabled={isProbing}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Directly probe this specific endpoint to measure upstream response"
                          >
                            <Activity className={`w-3.5 h-3.5 ${isProbing ? "animate-spin text-cyan-400" : "text-cyan-500"}`} />
                            <span>{isProbing ? "Probing..." : "Probe Endpoint"}</span>
                          </button>

                          {/* Probe Status Feedback */}
                          {probeRes && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${
                              probeRes.ok
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-fadeIn"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-fadeIn"
                            }`}>
                              {probeRes.ok ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              <span>{probeRes.status ? `HTTP ${probeRes.status}` : "Failed"} • {probeRes.latencyMs}ms</span>
                            </span>
                          )}

                          {/* Edit Full Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ep)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 transition-all"
                            title="Edit full endpoint metadata"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button (Custom Only) */}
                          {!ep.isBuiltIn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEndpoint(ep.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                              title="Delete custom endpoint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Active / Inactive Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer ml-1" title={ep.enabled !== false ? "Endpoint active" : "Endpoint disabled"}>
                            <input
                              type="checkbox"
                              checked={ep.enabled !== false}
                              onChange={() => handleToggleEndpointEnabled(ep.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Middle Row: Name and Description */}
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {ep.name}
                        </div>
                        {ep.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {ep.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Row: Editable Path and URL Previews */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                        {/* Inline Upstream Path Input */}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                            Upstream Path:
                          </span>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={ep.path}
                              onChange={(e) => handleInlinePathChange(ep.id, e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-cyan-700 dark:text-cyan-300 focus:outline-none focus:border-cyan-500"
                              placeholder="e.g. slides/slide1.php or slides_analytics.php?type=slide1"
                            />
                          </div>
                        </div>

                        {/* Copy Upstream Full URL */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => copyEndpointUrl(ep.id, fullUrl)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Copy direct upstream URL with token included"
                          >
                            {isCopiedFull ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopiedFull ? "URL Copied!" : "Copy Full URL"}</span>
                          </button>

                          {/* Copy Next.js Universal Proxy Route */}
                          <button
                            type="button"
                            onClick={() => copyProxyUrl(ep.id)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Copy internal Next.js proxy route for use in components"
                          >
                            {isCopiedProxy ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Code2 className="w-3.5 h-3.5" />}
                            <span>{isCopiedProxy ? "Proxy Copied!" : "Copy Proxy Route"}</span>
                          </button>

                          {/* Direct link */}
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/10 transition-all"
                            title="Open direct CRM URL in new browser tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit API Endpoint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-500" />
                  <span>{editingEndpoint ? "Edit API Endpoint" : "Register New API Endpoint"}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the upstream PHP script path, HTTP method, and category for this endpoint.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              {/* Template Quick Select (Only when adding new) */}
              {!editingEndpoint && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                    Start From Template (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ENDPOINT_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="p-2 rounded-xl text-left bg-slate-50 dark:bg-slate-800/80 hover:bg-cyan-500/10 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-all"
                      >
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {tmpl.name}
                        </div>
                        <div className="font-mono text-[10px] text-cyan-700 dark:text-cyan-300 mt-0.5 truncate">
                          {tmpl.path}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Endpoint ID Slug */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Endpoint Identifier / Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.id}
                  disabled={editingEndpoint?.isBuiltIn}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, id: e.target.value }))}
                  placeholder="e.g. agent_incentives or slide1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Used as query key in proxy routes: <code className="text-cyan-600 font-mono">/api/crm/proxy?endpoint={modalForm.id || "[id]"}</code>
                </span>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.name}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Daily Agent Incentive API"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Upstream Path or Full URL */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Upstream Path or Full URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.path}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, path: e.target.value }))}
                  placeholder="e.g. slides/slide1.php or slides_analytics.php?type=slide1"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block truncate">
                  Resolved upstream: <code className="text-cyan-700 dark:text-cyan-300 font-mono">{getFullUpstreamUrl(modalForm.path || "your-endpoint.php")}</code>
                </span>
              </div>

              {/* Fallback Path */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Fallback Path (Optional)
                </label>
                <input
                  type="text"
                  value={modalForm.fallbackPath}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, fallbackPath: e.target.value }))}
                  placeholder="e.g. slides_analytics.php?type=slide1"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically queried if the primary upstream path returns a 404 or connection error.
                </span>
              </div>

              {/* Method and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={modalForm.method}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, method: e.target.value as "GET" | "POST" }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="GET">GET (Query data)</option>
                    <option value="POST">POST (Submit / Save)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="presentation">Presentation (Slides & Displays)</option>
                    <option value="operations">Operations (SDRs & Heatmaps)</option>
                    <option value="targets">Targets & Quotas</option>
                    <option value="custom">Custom Project Route</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Description / Documentation
                </label>
                <textarea
                  value={modalForm.description}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Explain what this API endpoint provides or how it is utilized..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Enable Endpoint
                  </div>
                  <div className="text-[11px] text-slate-500">
                    When enabled, background sync workers and proxy routes will actively query this endpoint.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalForm.enabled}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalEndpoint}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 border border-cyan-400/30 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{editingEndpoint ? "Update Endpoint" : "Register Endpoint"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Live Endpoint Diagnostics */}
      {(activeTab === "diagnostics" || activeTab === "all") && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {activeTab === "all" && (
            <div className="flex items-center gap-2 pt-4 border-b border-slate-200/60 dark:border-white/10 pb-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Live Endpoint Diagnostics & Health Probe</h2>
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
