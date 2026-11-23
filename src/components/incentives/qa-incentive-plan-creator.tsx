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
  QaAdditionalRule,
  QaAdditionalRuleType,
} from "@/types/qa-incentives";
import { enrichPlanTiers, calculateQaIncentive } from "@/lib/qa-incentives/calculator";

interface QaPlanCreatorProps {
  onPlanSaved?: (plan: QaIncentivePlan) => void;
  onCancel?: () => void;
  initialPlan?: QaIncentivePlan | null;
}

export default function QaIncentivePlanCreator({
  onPlanSaved,
  onCancel,
  initialPlan,
}: QaPlanCreatorProps) {
  // Metadata options
  const [qaMembers, setQaMembers] = useState<QaMemberMeta[]>([]);
  const [clients, setClients] = useState<ClientMeta[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form State
  const [planName, setPlanName] = useState(
    initialPlan?.plan_name || "QA Campaign Activity Points Incentive Plan (50 Base Pts + Tier 1 & 2 Accelerators)"
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

  // Additional Rules State (e.g. Rectified leads daily incentive)
  const [additionalRules, setAdditionalRules] = useState<QaAdditionalRule[]>(
    initialPlan?.additional_rules && initialPlan.additional_rules.length > 0
      ? initialPlan.additional_rules
      : [
          {
            id: "ar-rectified-1",
            rule_name: "Rectified Leads Daily Bonus",
            status_name: "Rectified",
            rule_type: "PER_LEAD",
            min_count: 1,
            reward_amount: 25,
            point_factor: 1,
            is_active: true,
            description: "₹25 per rectified lead for the day",
          },
        ]
  );

  // Notes
  const [notes, setNotes] = useState(
    initialPlan?.notes || "Configured tier plan for QA lead audits with dynamic slab accelerators."
  );

  // Simulator test inputs
  const [simulatedLeads, setSimulatedLeads] = useState<number>(65);
  const [simulatedRectifiedLeads, setSimulatedRectifiedLeads] = useState<number>(3);

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

  // Synchronize form state when initialPlan changes (e.g. user clicks "Edit Plan")
  useEffect(() => {
    if (initialPlan) {
      setPlanName(initialPlan.plan_name || "");
      setSelectedAgentId(initialPlan.qa_agent_id ? String(initialPlan.qa_agent_id) : "ALL");
      setSelectedClientCode(initialPlan.client_code || "ALL");
      setAllCampaignsUnderClient(!initialPlan.campaign_id || initialPlan.campaign_id === 0);
      setSelectedCampaignId(initialPlan.campaign_id ? String(initialPlan.campaign_id) : "ALL");
      setFrequency(initialPlan.frequency || "DAILY");
      setBaseTargetLeads(initialPlan.base_target_leads || (initialPlan.frequency === "MONTHLY" ? 500 : 50));
      setBaseIncentiveAmount(initialPlan.base_incentive_amount ?? (initialPlan.frequency === "MONTHLY" ? 10000 : 500));
      setTiers(
        initialPlan.tiers && initialPlan.tiers.length > 0
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
      setAdditionalRules(
        initialPlan.additional_rules && initialPlan.additional_rules.length > 0
          ? initialPlan.additional_rules
          : []
      );
      setNotes(initialPlan.notes || "");
    } else {
      setPlanName("QA Campaign Activity Points Incentive Plan (50 Base Pts + Tier 1 & 2 Accelerators)");
      setSelectedAgentId("ALL");
      setSelectedClientCode("ALL");
      setAllCampaignsUnderClient(true);
      setSelectedCampaignId("ALL");
      setFrequency("DAILY");
      setBaseTargetLeads(50);
      setBaseIncentiveAmount(500);
      setTiers([
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
      ]);
      setAdditionalRules([
        {
          id: "ar-rectified-1",
          rule_name: "Rectified Leads Daily Bonus",
          status_name: "Rectified",
          rule_type: "PER_LEAD",
          min_count: 1,
          reward_amount: 25,
          point_factor: 1,
          is_active: true,
          description: "₹25 per rectified lead for the day",
        },
      ]);
      setNotes("Configured tier plan for QA lead audits with dynamic slab accelerators.");
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialPlan]);

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

  // Handle adding an additional status rule (e.g. Rectified leads)
  const handleAddAdditionalRule = () => {
    const newRule: QaAdditionalRule = {
      id: `ar-${Date.now()}`,
      rule_name: "Rectified Leads Incentive",
      status_name: "Rectified",
      rule_type: "PER_LEAD",
      min_count: 1,
      reward_amount: 25,
      point_factor: 1,
      is_active: true,
      description: "Additional bonus for audited rectified leads",
    };
    setAdditionalRules([...additionalRules, newRule]);
  };

  // Handle removing an additional status rule
  const handleRemoveAdditionalRule = (idx: number) => {
    setAdditionalRules(additionalRules.filter((_, i) => i !== idx));
  };

  // Handle additional rule value edit
  const handleAdditionalRuleChange = (idx: number, field: keyof QaAdditionalRule, val: any) => {
    const updated = [...additionalRules];
    updated[idx] = { ...updated[idx], [field]: val };
    setAdditionalRules(updated);
  };

  // Live enriched tiers with running cumulative totals
  const enrichedTiers = useMemo(() => {
    return enrichPlanTiers(baseTargetLeads, baseIncentiveAmount, tiers);
  }, [baseTargetLeads, baseIncentiveAmount, tiers]);

  // Transient plan model for live simulator
  const activePlanPreview: QaIncentivePlan = useMemo(() => {
    return {
      id: initialPlan?.id || "preview",
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
      additional_rules: additionalRules,
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
    additionalRules,
    notes,
  ]);

  // Live calculation based on simulated leads & rectified leads
  const simulationResult = useMemo(() => {
    return calculateQaIncentive(simulatedLeads, activePlanPreview, undefined, {
      actualPoints: simulatedLeads,
      actualLeadsAudited: simulatedLeads,
      rectifiedCount: simulatedRectifiedLeads,
      statusCounts: {
        Qualified: Math.round(simulatedLeads * 0.8),
        Disqualified: Math.round(simulatedLeads * 0.2),
        Rectified: simulatedRectifiedLeads,
      },
    });
  }, [simulatedLeads, simulatedRectifiedLeads, activePlanPreview]);

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
        additional_rules: additionalRules.map((r) => ({
          rule_name: r.rule_name.trim(),
          status_name: r.status_name.trim(),
          rule_type: r.rule_type,
          min_count: Number(r.min_count) || 0,
          reward_amount: Number(r.reward_amount) || 0,
          point_factor: Number(r.point_factor) || 1,
          is_active: r.is_active !== false,
          description: r.description || "",
        })),
        is_active: initialPlan?.is_active !== undefined ? initialPlan.is_active : true,
        notes,
      };

      const isEditing = Boolean(initialPlan && initialPlan.id);
      const url = isEditing
        ? `/api/qa-incentives/plans/${initialPlan!.id}`
        : "/api/qa-incentives/plans";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${isEditing ? "update" : "save"} QA incentive plan`);
      }

      setSuccessMsg(
        isEditing
          ? `QA Incentive Plan "${planName}" updated successfully!`
          : "QA Incentive Plan configured and saved successfully!"
      );
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
            {initialPlan ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> Editing Plan #{initialPlan.id} ({initialPlan.frequency})
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                <Sliders className="w-3 h-3" /> QA Team Architecture
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {initialPlan ? "Update Existing Incentive Plan" : "Multi-Tier Incentive Builder"}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            {initialPlan ? `Edit QA Incentive Plan: ${initialPlan.plan_name}` : "QA Team Incentive Plan Configuration"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {initialPlan
              ? "Modify lead audit targets, frequency, base rewards, and tiered slab accelerators for this plan."
              : "Configure QA member-wise, client-wise, and campaign-wise lead audit targets, daily/monthly frequency, base rewards, and tiered slab accelerators."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {initialPlan && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving
                ? initialPlan
                  ? "Updating Plan..."
                  : "Saving Plan..."
                : initialPlan
                ? "Update QA Incentive Plan"
                : "Save QA Incentive Plan"}
            </span>
          </button>
        </div>
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
              Base Target (Productivity Points) *
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={baseTargetLeads}
                onChange={(e) => setBaseTargetLeads(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">pts</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum campaign productivity points required to unlock the base incentive (e.g. 50 pts).
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
              Awarded once the base target points are reached (e.g. ₹500 at 50 pts).
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
            Points-Based Tier Slabs Configuration (Volume Accelerators)
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
          Define accelerators beyond the base points target. For example: Tier 1 (+10 pts @ ₹15 = ₹650 total at 60 pts); Tier 2 (+10 pts @ ₹20 = ₹850 total at 70 pts).
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
                <span className="text-[10px] font-bold uppercase text-slate-400">Extra Points</span>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={tier.extra_leads}
                    onChange={(e) => handleTierChange(idx, "extra_leads", Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">pts</span>
                </div>
              </div>

              <div className="md:col-span-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Rate / Point (₹)</span>
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
                    Up to {tier.cumulative_leads} pts
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

      {/* Step 4: Additional Incentive for Rectified Leads Only */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">
                4
              </span>
              Additional Incentive for Rectified Leads (Daily Plan Bonus)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure additional bonus payouts strictly and exclusively for audited leads with <strong>Rectified</strong> status. Only rectified leads qualify for this additional incentive.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddAdditionalRule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rectified Rule</span>
          </button>
        </div>

        {additionalRules.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-400">
            No additional rectified rules configured. Click &ldquo;Add Rectified Rule&rdquo; to add a bonus for rectified leads.
          </div>
        ) : (
          <div className="space-y-3">
            {additionalRules.map((rule, idx) => (
              <div
                key={rule.id || idx}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                {/* Rule Name */}
                <div className="md:col-span-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Rule Name</span>
                  <input
                    type="text"
                    value={rule.rule_name}
                    onChange={(e) => handleAdditionalRuleChange(idx, "rule_name", e.target.value)}
                    placeholder="e.g. Rectified Leads Bonus"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Target Status - Locked to Rectified Only */}
                <div className="md:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Eligible QA Status</span>
                  <div className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Rectified (Only)</span>
                  </div>
                </div>

                {/* Rule Type */}
                <div className="md:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Reward Type</span>
                  <select
                    value={rule.rule_type}
                    onChange={(e) => handleAdditionalRuleChange(idx, "rule_type", e.target.value as QaAdditionalRuleType)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="PER_LEAD">₹ Per Rectified Lead</option>
                    <option value="FLAT_BONUS">₹ Flat Bonus (Min Met)</option>
                    <option value="POINTS_PER_LEAD">Extra Points / Rectified Lead</option>
                  </select>
                </div>

                {/* Min Daily Count */}
                <div className="md:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Min Rectified Count</span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={rule.min_count}
                      onChange={(e) => handleAdditionalRuleChange(idx, "min_count", Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">leads</span>
                  </div>
                </div>

                {/* Reward Amount (₹) */}
                <div className="md:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    {rule.rule_type === "POINTS_PER_LEAD" ? "Points / Lead" : "Reward (₹)"}
                  </span>
                  <div className="relative">
                    {rule.rule_type !== "POINTS_PER_LEAD" && (
                      <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-bold">₹</span>
                    )}
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={rule.reward_amount}
                      onChange={(e) => handleAdditionalRuleChange(idx, "reward_amount", Number(e.target.value))}
                      className={`w-full ${
                        rule.rule_type !== "POINTS_PER_LEAD" ? "pl-5" : ""
                      } pr-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:border-cyan-500`}
                    />
                  </div>
                </div>

                {/* Delete */}
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalRule(idx)}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 5: Real-Time Interactive Payout Simulator */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Calculator className="w-4 h-4 text-cyan-500" />
            <span>Interactive Points & Rectified Payout Simulator (Test Your Configuration)</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Auditing Target: {baseTargetLeads} pts = {formatINR(baseIncentiveAmount)}
          </span>
        </div>

        {/* Simulator Sliders & Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white/70 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/10 items-center">
          {/* Main Points Slider */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Simulate Campaign Points Audited:
              </span>
              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-sm">
                {simulatedLeads} Points
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
              <span>0 pts</span>
              <span>Base: {baseTargetLeads} pts</span>
              {enrichedTiers.map((t) => (
                <span key={t.tier_order}>
                  T{t.tier_order}: {t.cumulative_leads}
                </span>
              ))}
            </div>
          </div>

          {/* Rectified Leads Slider */}
          <div className="lg:col-span-3 space-y-2 border-l border-slate-200 dark:border-white/10 lg:pl-4">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Simulate Rectified Leads:
              </span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                {simulatedRectifiedLeads} Leads
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={simulatedRectifiedLeads}
              onChange={(e) => setSimulatedRectifiedLeads(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 leads</span>
              <span>10 leads</span>
              <span>20 leads</span>
            </div>
          </div>

          {/* Output Card */}
          <div className="lg:col-span-4 flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                Grand Total Incentive
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {formatINR(simulationResult.total_incentive)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Base: {formatINR(simulationResult.base_incentive_earned)} • Tiers: {formatINR(simulationResult.total_tier_incentive)} • Extra: {formatINR(simulationResult.total_additional_incentive || 0)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Base Target</span>
            <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {simulatedLeads >= baseTargetLeads ? "Base Points Reached" : `${simulatedLeads}/${baseTargetLeads} Points`}
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
                {tb.leads_in_tier} pts × ₹{tb.rate_per_lead}/pt
              </div>
              <div className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                +{formatINR(tb.tier_incentive_earned)}
              </div>
            </div>
          ))}

          {/* Additional Rules Card in Simulator */}
          {simulationResult.additional_rules_breakdown && simulationResult.additional_rules_breakdown.map((arb, idx) => (
            <div
              key={arb.rule_id || idx}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
            >
              <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                {arb.rule_name}
              </span>
              <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {arb.matching_count} {arb.status_name} leads ({arb.is_qualified ? `≥${arb.min_count} min met` : `need ${arb.min_count}`})
              </div>
              <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatINR(arb.incentive_earned)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}

