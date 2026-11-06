"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Building,
  Target,
  Users,
  Coins,
  Clock,
  Layers,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { formatINR } from "@/lib/incentives/formatters";
import {
  QaIncentiveTier,
  QaMemberMeta,
  ClientMeta,
  CampaignMeta,
  TargetFrequency,
  QaIncentivePlan,
} from "@/types/qa-incentives";
import { enrichPlanTiers, calculateQaIncentive } from "@/lib/qa-incentives/calculator";

interface QaPlanCreatorProps {
  onPlanSaved?: (plan: QaIncentivePlan) => void;
  initialPlan?: QaIncentivePlan | null;
}

export default function QaIncentivePlanCreator({
  onPlanSaved,
  initialPlan,
}: QaPlanCreatorProps) {
  // Metadata options
  const [qaMembers, setQaMembers] = useState<QaMemberMeta[]>([]);
  const [clients, setClients] = useState<ClientMeta[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form State
  const [planName, setPlanName] = useState(
    initialPlan?.plan_name || "QA Lead Audit Incentive Plan (50 Base + Tier 1 & 2 Accelerators)"
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialPlan?.qa_agent_id ? String(initialPlan.qa_agent_id) : "ALL"
  );
  const [selectedClientCode, setSelectedClientCode] = useState<string>(
    initialPlan?.client_code || "ALL"
  );
  const [allCampaignsUnderClient, setAllCampaignsUnderClient] = useState<boolean>(
    !initialPlan?.campaign_id || initialPlan?.campaign_id === 0
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    initialPlan?.campaign_id ? String(initialPlan.campaign_id) : "ALL"
  );
  const [frequency, setFrequency] = useState<TargetFrequency>(
    initialPlan?.frequency || "DAILY"
  );
  const [baseTargetLeads, setBaseTargetLeads] = useState<number>(
    initialPlan?.base_target_leads || 50
  );
  const [baseIncentiveAmount, setBaseIncentiveAmount] = useState<number>(
    initialPlan?.base_incentive_amount || 500
  );

  // Tier Slabs State (Default to the exact user spec: 50 base -> Tier 1 (+10 @ 15 = 650) -> Tier 2 (+10 @ 20 = 850))
  const [tiers, setTiers] = useState<QaIncentiveTier[]>(
    initialPlan?.tiers && initialPlan.tiers.length > 0
      ? initialPlan.tiers
      : [
          {
            id: "t1",
            tier_order: 1,
            tier_name: "Tier 1 (+10 Leads Beyond Base)",
            extra_leads: 10,
            rate_per_lead: 15,
          },
          {
            id: "t2",
            tier_order: 2,
            tier_name: "Tier 2 (+10 Leads Beyond Tier 1)",
            extra_leads: 10,
            rate_per_lead: 20,
          },
        ]
  );

  // Notes
  const [notes, setNotes] = useState(
    initialPlan?.notes || "Configured tier plan for QA lead audits with dynamic slab accelerators."
  );

  // Simulator test input
  const [simulatedLeads, setSimulatedLeads] = useState<number>(65);

  // Submission feedback
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch metadata on mount
  useEffect(() => {
    async function fetchMeta() {
      setLoadingMeta(true);
      try {
        const res = await fetch("/api/qa-incentives/meta");
        const json = await res.json();
        if (json.success && json.data) {
          setQaMembers(json.data.qa_members || []);
          setClients(json.data.clients || []);
          setCampaigns(json.data.campaigns || []);
        }
      } catch (e) {
        console.error("Error fetching QA incentive metadata:", e);
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, []);

  // Filter campaigns matching the selected client code
  const availableCampaigns = useMemo(() => {
    if (selectedClientCode === "ALL") {
      return campaigns;
    }
    return campaigns.filter((c) => c.client_code === selectedClientCode);
  }, [campaigns, selectedClientCode]);

  // Adjust campaign selection if client code changes
  useEffect(() => {
    if (selectedClientCode !== "ALL" && !allCampaignsUnderClient) {
      const match = availableCampaigns.some((c) => String(c.campaign_id) === selectedCampaignId);
      if (!match && availableCampaigns.length > 0) {
        setSelectedCampaignId(String(availableCampaigns[0].campaign_id));
      }
    }
  }, [selectedClientCode, allCampaignsUnderClient, availableCampaigns, selectedCampaignId]);

  // Handle adding a new tier slab
  const handleAddTier = () => {
    const nextOrder = tiers.length + 1;
    const lastTier = tiers[tiers.length - 1];
    const nextRate = lastTier ? lastTier.rate_per_lead + 5 : 25;

    const newTier: QaIncentiveTier = {
      id: `t${Date.now()}`,
      tier_order: nextOrder,
      tier_name: `Tier ${nextOrder} (+10 Leads Beyond Tier ${nextOrder - 1})`,
      extra_leads: 10,
      rate_per_lead: nextRate,
    };
    setTiers([...tiers, newTier]);
  };

  // Handle removing a tier
  const handleRemoveTier = (idx: number) => {
    const filtered = tiers.filter((_, i) => i !== idx);
    const reindexed = filtered.map((t, i) => ({
      ...t,
      tier_order: i + 1,
      tier_name: `Tier ${i + 1} (+${t.extra_leads} Leads)`,
    }));
    setTiers(reindexed);
  };

  // Handle tier value edit
  const handleTierChange = (idx: number, field: keyof QaIncentiveTier, val: any) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], [field]: val };
    setTiers(updated);
  };

  // Live enriched tiers with running cumulative totals
  const enrichedTiers = useMemo(() => {
    return enrichPlanTiers(baseTargetLeads, baseIncentiveAmount, tiers);
  }, [baseTargetLeads, baseIncentiveAmount, tiers]);

  // Transient plan model for live simulator
  const activePlanPreview: QaIncentivePlan = useMemo(() => {
    return {
      id: "preview",
      plan_name: planName,
      qa_agent_id: selectedAgentId === "ALL" ? null : Number(selectedAgentId),
      qa_agent_name:
        selectedAgentId === "ALL"
          ? "All QA Members"
          : qaMembers.find((m) => String(m.user_id) === selectedAgentId)?.full_name || "Specific QA Member",
      client_code: selectedClientCode,
      campaign_id: allCampaignsUnderClient || selectedCampaignId === "ALL" ? null : Number(selectedCampaignId),
      campaign_name:
        allCampaignsUnderClient || selectedCampaignId === "ALL"
          ? `All Campaigns (${selectedClientCode === "ALL" ? "All Clients" : selectedClientCode})`
          : campaigns.find((c) => String(c.campaign_id) === selectedCampaignId)?.campaign_name || "Specific Campaign",
      frequency,
      base_target_leads: baseTargetLeads,
      base_incentive_amount: baseIncentiveAmount,
      tiers: enrichedTiers,
      is_active: true,
      notes,
    };
  }, [
    planName,
    selectedAgentId,
    qaMembers,
    selectedClientCode,
    allCampaignsUnderClient,
    selectedCampaignId,
    campaigns,
    frequency,
    baseTargetLeads,
    baseIncentiveAmount,
    enrichedTiers,
    notes,
  ]);

  // Live calculation based on simulated leads
  const simulationResult = useMemo(() => {
    return calculateQaIncentive(simulatedLeads, activePlanPreview);
  }, [simulatedLeads, activePlanPreview]);

  // Save Plan Handler
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      if (!planName.trim()) {
        throw new Error("Please provide a plan name.");
      }
      if (baseTargetLeads <= 0) {
        throw new Error("Base target leads must be greater than zero.");
      }
      if (baseIncentiveAmount < 0) {
        throw new Error("Base incentive amount cannot be negative.");
      }

      const payload = {
        plan_name: planName.trim(),
        qa_agent_id: selectedAgentId === "ALL" ? null : Number(selectedAgentId),
        qa_agent_name: activePlanPreview.qa_agent_name,
        client_code: selectedClientCode,
        campaign_id: activePlanPreview.campaign_id,
        campaign_name: activePlanPreview.campaign_name,
        frequency,
        base_target_leads: Number(baseTargetLeads),
        base_incentive_amount: Number(baseIncentiveAmount),
        tiers: enrichedTiers.map((t) => ({
          tier_order: t.tier_order,
          tier_name: t.tier_name,
          extra_leads: Number(t.extra_leads),
          rate_per_lead: Number(t.rate_per_lead),
        })),
        is_active: true,
        notes,
      };

      const res = await fetch("/api/qa-incentives/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save QA incentive plan");
      }

      setSuccessMsg("QA Incentive Plan configured and saved successfully!");
      if (onPlanSaved) {
        onPlanSaved(json.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSavePlan} className="flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
              <Sliders className="w-3 h-3" /> QA Team Architecture
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Multi-Tier Incentive Builder</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            QA Team Incentive Plan Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure QA member-wise, client-wise, and campaign-wise lead audit targets, daily/monthly frequency, base rewards, and tiered slab accelerators.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Plan..." : "Save QA Incentive Plan"}</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step 1: Scope & Assignment (QA Member, Client, Campaign) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">
            1
          </span>
          Target Scope & Assignment (Agent, Client & Campaign Selection)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Plan Name */}
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Incentive Plan Name *
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. QA FinTech Daily Audit Plan"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
            />
          </div>

          {/* QA Team Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-500" />
              Select QA Team Member *
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">All QA Team Members (Universal Rule)</option>
              {qaMembers.map((member) => (
                <option key={member.user_id} value={String(member.user_id)}>
                  {member.full_name} ({member.role})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Configure per individual QA analyst or team-wide.
            </p>
          </div>

          {/* Client Code Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-500" />
              Select Client Code *
            </label>
            <select
              value={selectedClientCode}
              onChange={(e) => setSelectedClientCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Clients (All Client Codes)</option>
              {clients.map((c) => (
                <option key={c.client_code} value={c.client_code}>
                  {c.client_code} — {c.client_name} ({c.campaign_count} Campaigns)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Target leads across all clients or a specific client account.
            </p>
          </div>

          {/* Campaign Selection & All-Campaigns Option */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Select Campaign(s) *
              </label>
              <label className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={allCampaignsUnderClient}
                  onChange={(e) => setAllCampaignsUnderClient(e.target.checked)}
                  className="rounded text-cyan-600"
                />
                All Campaigns
              </label>
            </div>

            <select
              disabled={allCampaignsUnderClient}
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {allCampaignsUnderClient ? (
                <option value="ALL">
                  All Campaigns under {selectedClientCode === "ALL" ? "All Clients" : selectedClientCode}
                </option>
              ) : (
                <>
                  <option value="ALL">All Campaigns</option>
                  {availableCampaigns.map((camp) => (
                    <option key={camp.campaign_id} value={String(camp.campaign_id)}>
                      {camp.campaign_name} ({camp.client_code})
                    </option>
                  ))}
                </>
              )}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Independently select all campaigns under one client or individual campaigns.
            </p>
          </div>
        </div>
      </div>

      {/* Step 2: Target Frequency & Base Target */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">
            2
          </span>
          Target Frequency & Base Lead Audit Threshold
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Frequency Toggle: Daily vs Monthly */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              Dynamic Frequency (Daily or Monthly) *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setFrequency("DAILY");
                  if (baseTargetLeads > 150) setBaseTargetLeads(50);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frequency === "DAILY"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Daily Target
              </button>
              <button
                type="button"
                onClick={() => {
                  setFrequency("MONTHLY");
                  if (baseTargetLeads <= 100) setBaseTargetLeads(1000);
                  if (baseIncentiveAmount <= 500) setBaseIncentiveAmount(10000);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  frequency === "MONTHLY"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Monthly Target
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {frequency === "DAILY" ? "Evaluated per 9-hour work shift." : "Cumulative monthly audit target."}
            </p>
          </div>

          {/* Base Target Leads Audited */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Base Target of Leads Audited *
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={baseTargetLeads}
                onChange={(e) => setBaseTargetLeads(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">leads</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum leads audited required to unlock the base incentive (e.g. 50 leads).
            </p>
          </div>

          {/* Base Incentive Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Base Incentive Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min={0}
                step={50}
                value={baseIncentiveAmount}
                onChange={(e) => setBaseIncentiveAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Awarded once the base target is reached (e.g. ₹500 at 50 leads).
            </p>
          </div>
        </div>
      </div>

      {/* Step 3: Tiered Incentive Configuration (Tiers of the Incentive) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">
              3
            </span>
            Tiers of the Incentive Configuration (Volume Accelerators)
          </div>

          <button
            type="button"
            onClick={handleAddTier}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Next Tier Slab</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Define accelerators beyond the base target. For example: Tier 1 (+10 leads @ ₹15 = ₹650 total at 60 leads); Tier 2 (+10 leads @ ₹20 = ₹850 total at 70 leads).
        </p>

        {/* Tiers List */}
        <div className="space-y-3">
          {enrichedTiers.map((tier, idx) => (
            <div
              key={tier.id || idx}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
            >
              <div className="md:col-span-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">Tier Name</span>
                <input
                  type="text"
                  value={tier.tier_name}
                  onChange={(e) => handleTierChange(idx, "tier_name", e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Extra Leads</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={tier.extra_leads}
                    onChange={(e) => handleTierChange(idx, "extra_leads", Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">leads</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Rate / Lead (₹)</span>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={tier.rate_per_lead}
                    onChange={(e) => handleTierChange(idx, "rate_per_lead", Number(e.target.value))}
                    className="w-full pl-5 pr-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-4 flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs">
                <div>
                  <div className="text-[10px] text-slate-500">Tier Range</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    Up to {tier.cumulative_leads} leads
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    +{formatINR(tier.tier_reward || 0)}
                  </div>
                  <div className="font-mono font-black text-amber-600 dark:text-amber-400">
                    Total: {formatINR(tier.total_cumulative_reward || 0)}
                  </div>
                </div>
              </div>

              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveTier(idx)}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove Tier Slab"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 4: Real-Time Interactive Payout Simulator */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Calculator className="w-4 h-4 text-cyan-500" />
            <span>Interactive Payout Simulator (Test Your Configuration)</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Auditing Target: {baseTargetLeads} leads = {formatINR(baseIncentiveAmount)}
          </span>
        </div>

        {/* Simulator Slider & Input */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/10">
          <div className="w-full sm:w-2/3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Simulate Leads Audited by QA Analyst:
              </span>
              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                {simulatedLeads} Leads
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={baseTargetLeads * 2}
              value={simulatedLeads}
              onChange={(e) => setSimulatedLeads(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 leads</span>
              <span>Base: {baseTargetLeads}</span>
              {enrichedTiers.map((t) => (
                <span key={t.tier_order}>
                  T{t.tier_order}: {t.cumulative_leads}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-1/3 flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                Calculated QA Incentive
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {formatINR(simulationResult.total_incentive)}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                simulationResult.base_target_achieved
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
              }`}
            >
              {simulationResult.base_target_achieved ? "Target Achieved" : "Below Target"}
            </span>
          </div>
        </div>

        {/* Step-by-Step Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Base Target</span>
            <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {simulatedLeads >= baseTargetLeads ? "50/50 Leads Reached" : `${simulatedLeads}/${baseTargetLeads} Leads`}
            </div>
            <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(simulationResult.base_incentive_earned)}
            </div>
          </div>

          {simulationResult.tier_breakdown.map((tb) => (
            <div
              key={tb.tier_order}
              className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5"
            >
              <span className="text-[10px] font-bold uppercase text-slate-400">{tb.tier_name}</span>
              <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tb.leads_in_tier} leads × ₹{tb.rate_per_lead}/lead
              </div>
              <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                +{formatINR(tb.tier_incentive_earned)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

