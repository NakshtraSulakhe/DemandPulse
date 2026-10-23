"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useCampaignTargets, useSaveCampaignTargets } from "@/hooks/use-slide-analytics";
import { formatNumber, formatPercent } from "@/lib/utils";
import { calculateDailyRemaining } from "@/lib/calculations";
import { TargetAllocationInput, AdminCampaignTargetItem } from "@/types";
import {
  Target,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  Search,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";

/**
 * Returns today's date formatted as YYYY-MM-DD in US Eastern time (America/New_York)
 */
function getTodayUSEastern(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export default function CampaignTargetsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayUSEastern);
  const [statusFilter, setStatusFilter] = useState<"Live" | "all">("Live");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [clientDropdownOpen, setClientDropdownOpen] = useState<boolean>(false);
  const [clientSearchText, setClientSearchText] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Target drafts and original targets for change-detection
  const [targetDrafts, setTargetDrafts] = useState<Record<number, { target: number; notes: string }>>({});
  const [originalTargets, setOriginalTargets] = useState<Record<number, number>>({});
  const [inputErrors, setInputErrors] = useState<Record<number, string>>({});

  // Notification status toast
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close client dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: targetsData, isLoading, isFetching, refetch } = useCampaignTargets(selectedDate, statusFilter);
  const saveMutation = useSaveCampaignTargets();

  const campaigns: AdminCampaignTargetItem[] = useMemo(() => targetsData?.data?.campaigns || [], [targetsData?.data?.campaigns]);

  // Extract unique sorted client codes from API response and visible campaigns
  const clientCodes = useMemo(() => {
    const set = new Set<string>();
    if (targetsData?.data?.client_codes) {
      targetsData.data.client_codes.forEach((c) => {
        if (c && c.trim()) set.add(c.trim());
      });
    }
    campaigns.forEach((c) => {
      if (c.client_code && c.client_code.trim()) {
        set.add(c.client_code.trim());
      }
    });
    return Array.from(set).sort();
  }, [targetsData?.data?.client_codes, campaigns]);

  // Filtered client codes for the searchable dropdown
  const filteredClientCodes = useMemo(() => {
    if (!clientSearchText.trim()) return clientCodes;
    const q = clientSearchText.toLowerCase();
    return clientCodes.filter((code) => code.toLowerCase().includes(q));
  }, [clientCodes, clientSearchText]);

  // Initialize draft inputs and original values when data loads or date changes
  useEffect(() => {
    if (campaigns.length > 0) {
      const initialDrafts: Record<number, { target: number; notes: string }> = {};
      const initialOriginals: Record<number, number> = {};

      campaigns.forEach((c) => {
        const targetVal = typeof c.daily_target === "number" ? c.daily_target : 0;
        initialDrafts[c.campaign_id] = {
          target: targetVal,
          notes: c.notes || "",
        };
        initialOriginals[c.campaign_id] = targetVal;
      });

      setTargetDrafts(initialDrafts);
      setOriginalTargets(initialOriginals);
      setInputErrors({});
    } else {
      setTargetDrafts({});
      setOriginalTargets({});
      setInputErrors({});
    }
  }, [campaigns, selectedDate]);

  // Handle target input change with validation
  const handleTargetChange = (campaignId: number, rawVal: string) => {
    const val = parseInt(rawVal, 10);

    if (rawVal === "") {
      // Allow user to temporarily clear input, default to 0 for drafts
      setTargetDrafts((prev) => ({
        ...prev,
        [campaignId]: {
          ...(prev[campaignId] || { notes: "" }),
          target: 0,
        },
      }));
      setInputErrors((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      return;
    }

    if (isNaN(val) || val < 0) {
      setInputErrors((prev) => ({
        ...prev,
        [campaignId]: "Must be a non-negative integer",
      }));
      return;
    }

    setInputErrors((prev) => {
      const next = { ...prev };
      delete next[campaignId];
      return next;
    });

    setTargetDrafts((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { notes: "" }),
        target: val,
      },
    }));
  };

  // Identify campaigns with changed allocations
  const changedCampaignIds = useMemo(() => {
    const changed: number[] = [];
    campaigns.forEach((c) => {
      const orig = originalTargets[c.campaign_id] ?? (c.daily_target || 0);
      const draft = targetDrafts[c.campaign_id]?.target;
      if (draft !== undefined && draft !== orig) {
        changed.push(c.campaign_id);
      }
    });
    return changed;
  }, [campaigns, originalTargets, targetDrafts]);

  // Filter campaigns by Client Code and Open Search
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      // 1. Client Code filter
      if (clientFilter && clientFilter !== "ALL") {
        const campClient = (camp.client_code || "").trim().toLowerCase();
        if (campClient !== clientFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 2. Open Search (case-insensitive across name, client code, campaign ID)
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchName = (camp.campaign_name || "").toLowerCase().includes(q);
        const matchClient = (camp.client_code || "").toLowerCase().includes(q);
        const matchId = String(camp.campaign_id || "").includes(q);
        const matchCode = (camp.campaign_code || "").toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchId && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [campaigns, clientFilter, searchTerm]);

  // Calculate totals strictly from visible/filtered campaigns
  const visibleTotals = useMemo(() => {
    let monthlyAlloc = 0;
    let dailyTarget = 0;
    let generated = 0;
    let qualified = 0;
    let disqualified = 0;
    let pendingQa = 0;

    filteredCampaigns.forEach((c) => {
      monthlyAlloc += c.monthly_allocation || 0;
      const currentTarget = targetDrafts[c.campaign_id]?.target ?? c.daily_target ?? 0;
      dailyTarget += currentTarget;
      generated += c.generated_leads || 0;
      qualified += c.qualified_leads || 0;
      disqualified += c.disqualified_leads || 0;
      pendingQa += c.pending_qa || 0;
    });

    const dailyRemaining = calculateDailyRemaining(dailyTarget, qualified);
    const overallProgress = dailyTarget > 0 ? (qualified / dailyTarget) * 100 : 0;

    return {
      monthlyAlloc,
      dailyTarget,
      generated,
      qualified,
      disqualified,
      pendingQa,
      dailyRemaining,
      overallProgress,
    };
  }, [filteredCampaigns, targetDrafts]);

  // Save Allocation Button Handler
  const handleSaveAllocation = async () => {
    setSaveStatus(null);

    // If no changes exist, do not send unnecessary request
    if (changedCampaignIds.length === 0) {
      setSaveStatus({
        type: "info",
        message: "No allocation changes to save for this date.",
      });
      return;
    }

    // Check for any input validation errors
    if (Object.keys(inputErrors).length > 0) {
      setSaveStatus({
        type: "error",
        message: "Please correct invalid daily target values before saving. Targets must be non-negative integers.",
      });
      return;
    }

    // Build payload of only changed allocations
    const changedTargets: TargetAllocationInput[] = [];
    for (const id of changedCampaignIds) {
      const draft = targetDrafts[id];
      if (!draft || draft.target === undefined || draft.target < 0 || !Number.isInteger(draft.target)) {
        setSaveStatus({
          type: "error",
          message: `Campaign ID ${id} has an invalid daily target. Targets must be non-negative integers.`,
        });
        return;
      }
      changedTargets.push({
        campaign_id: id,
        daily_target: draft.target,
        notes: draft.notes || "",
      });
    }

    try {
      await saveMutation.mutateAsync({
        target_date: selectedDate,
        targets: changedTargets,
      });

      // Update original targets to reflect newly saved values
      setOriginalTargets((prev) => {
        const next = { ...prev };
        changedTargets.forEach((t) => {
          next[t.campaign_id] = t.daily_target;
        });
        return next;
      });

      setSaveStatus({
        type: "success",
        message: "Daily campaign allocations saved successfully.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save daily campaign allocations";
      setSaveStatus({
        type: "error",
        message: msg,
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Campaign Daily Targets Allocation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Allocate daily campaign targets and monitor real-time fulfillment across qualified leads
          </p>
        </div>

        {/* Date Selector, Status Filter & Save Allocation */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("Live")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "Live"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Only Live campaigns: WHERE c.active = 1 AND (d.status = 'Live' OR d.status IS NULL)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  statusFilter === "Live" ? "bg-white" : "bg-emerald-500"
                } animate-pulse`}
              />
              <span>Live Campaigns</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="All active campaigns (including paused or draft)"
            >
              <span>All Campaigns</span>
            </button>
          </div>

          {/* Date Selector (US Eastern Business Date) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
              title="US Eastern Business Date"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh campaign targets and live CRM leads"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>

          {/* Single Page-Level "Save Allocation" Button */}
          <button
            onClick={handleSaveAllocation}
            disabled={saveMutation.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
              changedCampaignIds.length > 0
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30 border border-cyan-400/40 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shadow-none opacity-90"
            } disabled:opacity-50`}
            title={
              changedCampaignIds.length > 0
                ? `Save ${changedCampaignIds.length} changed allocation${changedCampaignIds.length > 1 ? "s" : ""}`
                : "Save Allocation"
            }
          >
            <Save className="w-4 h-4" />
            <span>
              {saveMutation.isPending
                ? "Saving..."
                : changedCampaignIds.length > 0
                ? `Save Allocation (${changedCampaignIds.length})`
                : "Save Allocation"}
            </span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border transition-all ${
            saveStatus.type === "success"
              ? "bg-emerald-100/90 dark:bg-emerald-950/60 border-emerald-400/50 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200"
              : saveStatus.type === "info"
              ? "bg-blue-100/90 dark:bg-blue-950/60 border-blue-400/50 dark:border-blue-500/40 text-blue-800 dark:text-blue-200"
              : "bg-rose-100/90 dark:bg-rose-950/60 border-rose-400/50 dark:border-rose-500/40 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : saveStatus.type === "info" ? (
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{saveStatus.message}</span>
          </div>
          <button
            onClick={() => setSaveStatus(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Stat Cards (Calculated from filtered/visible campaigns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Monthly Alloc
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatNumber(visibleTotals.monthlyAlloc)}{" "}
            <span className="text-xs text-slate-500 dark:text-slate-400">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Visible campaign contracts</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Target Total
          </span>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
            {formatNumber(visibleTotals.dailyTarget)}{" "}
            <span className="text-xs text-cyan-700 dark:text-cyan-300">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Assigned for {selectedDate}</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Today Qualified
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNumber(visibleTotals.qualified)}{" "}
            <span className="text-xs text-emerald-700 dark:text-emerald-300">leads</span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatPercent(visibleTotals.overallProgress)} achieved
          </p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Remaining
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-300 mt-1">
            {formatNumber(visibleTotals.dailyRemaining)}{" "}
            <span className="text-xs text-blue-700 dark:text-blue-200">leads</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            MAX(0, Target - Qualified)
          </p>
        </div>
      </div>

      {/* Target Allocation Table Panel */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col">
        {/* Controls Bar: Section 3.1 Client Filter & Section 3.2 Open Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>{statusFilter === "Live" ? "Live CRM Campaigns" : "All CRM Campaigns"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                {filteredCampaigns.length} of {campaigns.length} Visible
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {statusFilter === "Live"
                ? "Active live campaigns synchronized from DemandFlow Bridge CRM."
                : "All active campaigns in DemandFlow Bridge CRM (including draft/paused)."}
            </p>
          </div>

          {/* Filter Controls: Client Code Dropdown + Open Search */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Searchable Client Code Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setClientDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border text-xs font-medium transition-all cursor-pointer ${
                  clientFilter !== "ALL"
                    ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    : "border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {clientFilter === "ALL" ? "All Clients" : `Client: ${clientFilter}`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
              </button>

              {/* Client Code Filter Dropdown Menu */}
              {clientDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-2xl z-50 p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                    <Search className="w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter client codes..."
                      value={clientSearchText}
                      onChange={(e) => setClientSearchText(e.target.value)}
                      className="bg-transparent outline-none text-xs w-full text-slate-800 dark:text-slate-200"
                      autoFocus
                    />
                    {clientSearchText && (
                      <button
                        onClick={() => setClientSearchText("")}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setClientFilter("ALL");
                        setClientDropdownOpen(false);
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        clientFilter === "ALL"
                          ? "bg-cyan-600 text-white font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>All Clients</span>
                      <span className="text-[10px] opacity-75">{campaigns.length}</span>
                    </button>

                    {filteredClientCodes.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-slate-400">
                        No clients matching &quot;{clientSearchText}&quot;
                      </div>
                    ) : (
                      filteredClientCodes.map((code) => {
                        const count = campaigns.filter(
                          (c) => (c.client_code || "").trim() === code
                        ).length;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => {
                              setClientFilter(code);
                              setClientDropdownOpen(false);
                            }}
                            className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                              clientFilter === code
                                ? "bg-cyan-600 text-white font-bold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                            }`}
                          >
                            <span className="font-mono">{code}</span>
                            <span className="text-[10px] opacity-75">{count}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {clientFilter !== "ALL" && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientFilter("ALL");
                        setClientDropdownOpen(false);
                      }}
                      className="mt-1 pt-1 border-t border-slate-200 dark:border-white/10 text-center text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Clear Client Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Clear client filter quick badge */}
            {clientFilter !== "ALL" && (
              <button
                onClick={() => setClientFilter("ALL")}
                className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer"
                title="Reset to All Clients"
              >
                <span>Clear</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Open Search Bar */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search campaign, client, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Campaign Allocation Table */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Loading campaign targets from CRM and database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/95 text-slate-700 dark:bg-slate-900/80 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-white/10">
                <tr>
                  {/* Campaign Column: Name and Client Code only */}
                  <th className="py-3 px-3">Campaign</th>
                  <th className="py-3 px-2 text-center">Monthly Allocation</th>
                  <th className="py-3 px-3 text-center text-cyan-700 dark:text-cyan-300 min-w-[130px]">
                    Daily Target
                  </th>
                  <th className="py-3 px-2 text-center">Generated</th>
                  <th className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">Qualified</th>
                  <th className="py-3 px-2 text-center text-rose-600 dark:text-rose-400">Disqualified</th>
                  <th className="py-3 px-2 text-center text-amber-600 dark:text-amber-400">Pending QA</th>
                  <th className="py-3 px-2 text-center text-blue-700 dark:text-blue-300 font-bold">
                    Daily Remaining
                  </th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Progress</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      {campaigns.length === 0
                        ? `No campaigns returned by CRM for date ${selectedDate}.`
                        : "No campaigns matching the selected client code or search filter."}
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((camp) => {
                    const draft = targetDrafts[camp.campaign_id] || {
                      target: camp.daily_target || 0,
                      notes: camp.notes || "",
                    };
                    const origVal = originalTargets[camp.campaign_id] ?? (camp.daily_target || 0);
                    const isChanged = draft.target !== origVal;
                    const targetVal = draft.target;
                    const dailyRemaining = calculateDailyRemaining(targetVal, camp.qualified_leads);
                    const pct = targetVal > 0 ? Math.round((camp.qualified_leads / targetVal) * 1000) / 10 : 0;
                    const isMet = dailyRemaining === 0 && targetVal > 0;
                    const hasError = !!inputErrors[camp.campaign_id];

                    return (
                      <tr
                        key={camp.campaign_id}
                        className={`transition-colors ${
                          isChanged
                            ? "bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]"
                            : "hover:bg-slate-100/60 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* 1. Campaign Column: Display ONLY Campaign Name and Client Code */}
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {camp.campaign_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {camp.client_code || camp.campaign_code}
                          </div>
                        </td>

                        {/* 2. Monthly Allocation */}
                        <td className="py-3.5 px-2 text-center font-medium text-slate-700 dark:text-slate-300">
                          {formatNumber(camp.monthly_allocation)}
                        </td>

                        {/* 3. Daily Target: Editable numeric field, integer >= 0 */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={targetVal}
                                onChange={(e) => handleTargetChange(camp.campaign_id, e.target.value)}
                                className={`w-20 px-2.5 py-1 text-center font-bold rounded-lg text-xs shadow-inner focus:outline-none transition-all ${
                                  hasError
                                    ? "bg-rose-50 dark:bg-rose-950/60 border border-rose-500 text-rose-700 dark:text-rose-300"
                                    : isChanged
                                    ? "bg-cyan-50 dark:bg-cyan-950/50 border-2 border-cyan-500 text-cyan-800 dark:text-cyan-200 ring-1 ring-cyan-400/40"
                                    : "bg-white dark:bg-slate-900 border border-cyan-500/50 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 focus:ring-1 focus:ring-cyan-400"
                                }`}
                              />
                              <span className="text-[10px] text-slate-500">leads</span>
                            </div>
                            {hasError && (
                              <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                                {inputErrors[camp.campaign_id]}
                              </span>
                            )}
                            {isChanged && !hasError && (
                              <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                                Unsaved (orig: {origVal})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Generated Leads */}
                        <td className="py-3.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300">
                          {formatNumber(camp.generated_leads)}
                        </td>

                        {/* 5. Qualified Leads */}
                        <td className="py-3.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(camp.qualified_leads)}
                        </td>

                        {/* 6. Disqualified Leads */}
                        <td className="py-3.5 px-2 text-center text-rose-600 dark:text-rose-400 font-medium">
                          {formatNumber(camp.disqualified_leads)}
                        </td>

                        {/* 7. Pending QA Leads */}
                        <td className="py-3.5 px-2 text-center text-amber-600 dark:text-amber-400 font-medium">
                          {formatNumber(camp.pending_qa)}
                        </td>

                        {/* 8. Daily Remaining: MAX(0, Daily Target - Qualified Leads) */}
                        <td className="py-3.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              isMet
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {isMet ? "Met (0)" : dailyRemaining}
                          </span>
                        </td>

                        {/* 9. Progress: Qualified / Daily Target * 100 */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 100
                                    ? "bg-emerald-500"
                                    : pct >= 50
                                    ? "bg-cyan-500"
                                    : pct > 0
                                    ? "bg-amber-500"
                                    : "bg-transparent"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              {targetVal > 0 ? formatPercent(pct) : "0%"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Section 9: Total Allocation Footer */}
              {filteredCampaigns.length > 0 && (
                <tfoot className="bg-slate-100 dark:bg-slate-900/90 border-t-2 border-slate-300 dark:border-white/20 font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wider text-[11px] font-black">
                          Total ({filteredCampaigns.length})
                        </span>
                      </div>
                    </td>

                    {/* Total Monthly Allocation */}
                    <td className="py-3.5 px-2 text-center text-slate-800 dark:text-slate-200 font-bold">
                      {formatNumber(visibleTotals.monthlyAlloc)}
                    </td>

                    {/* Total Daily Target */}
                    <td className="py-3.5 px-3 text-center text-cyan-700 dark:text-cyan-300 font-bold">
                      {formatNumber(visibleTotals.dailyTarget)}
                    </td>

                    {/* Total Generated */}
                    <td className="py-3.5 px-2 text-center text-slate-800 dark:text-slate-200 font-bold">
                      {formatNumber(visibleTotals.generated)}
                    </td>

                    {/* Total Qualified */}
                    <td className="py-3.5 px-2 text-center text-emerald-600 dark:text-emerald-400 font-black">
                      {formatNumber(visibleTotals.qualified)}
                    </td>

                    {/* Total Disqualified */}
                    <td className="py-3.5 px-2 text-center text-rose-600 dark:text-rose-400 font-bold">
                      {formatNumber(visibleTotals.disqualified)}
                    </td>

                    {/* Total Pending QA */}
                    <td className="py-3.5 px-2 text-center text-amber-600 dark:text-amber-400 font-bold">
                      {formatNumber(visibleTotals.pendingQa)}
                    </td>

                    {/* Total Daily Remaining */}
                    <td className="py-3.5 px-2 text-center text-blue-700 dark:text-blue-300 font-black">
                      {formatNumber(visibleTotals.dailyRemaining)}
                    </td>

                    {/* Overall Progress */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 text-xs font-black">
                        {formatPercent(visibleTotals.overallProgress)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
