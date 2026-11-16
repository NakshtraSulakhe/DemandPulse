"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserCheck,
  Crown,
  ShieldCheck,
  Award,
  Coins,
  Target,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Search,
  Sliders,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  Layers,
  Eye,
  X,
  ArrowRight,
  Check,
  Filter,
} from "lucide-react";
import { formatINR, formatPercentage } from "@/lib/incentives/formatters";
import {
  LeadershipMember,
  LeadershipRole,
  LeadershipFrequency,
  LeadershipIncentivePlan,
  LeadershipIncentiveTier,
  LeadershipDailyCalculation,
  LeadershipMonthlyCalculation,
  AssignableAgent,
} from "@/types/leadership-incentives";

export default function LeadershipIncentiveHub() {
  const [activeSubTab, setActiveSubTab] = useState<
    "daily_calc" | "monthly_calc" | "leaders_team" | "plans_config"
  >("daily_calc");

  // Daily State
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyCalculations, setDailyCalculations] = useState<LeadershipDailyCalculation[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly State
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthlyCalculations, setMonthlyCalculations] = useState<LeadershipMonthlyCalculation[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Members & Assignments State
  const [members, setMembers] = useState<LeadershipMember[]>([]);
  const [allAgents, setAllAgents] = useState<AssignableAgent[]>([]);
  const [crmRoster, setCrmRoster] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [syncingCrm, setSyncingCrm] = useState(false);

  // Plans State
  const [plans, setPlans] = useState<LeadershipIncentivePlan[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>("team_leader_daily");
  const [plansLoading, setPlansLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Modals & Drawers
  const [selectedBreakdownDaily, setSelectedBreakdownDaily] =
    useState<LeadershipDailyCalculation | null>(null);
  const [selectedBreakdownMonthly, setSelectedBreakdownMonthly] =
    useState<LeadershipMonthlyCalculation | null>(null);

  // Add / Edit Leader Modal
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<Partial<LeadershipMember> | null>(null);
  const [leaderFormSaving, setLeaderFormSaving] = useState(false);

  // Assign Agents Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningLeader, setAssigningLeader] = useState<LeadershipMember | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<number>>(new Set());
  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Search & Role Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "team_leader" | "manager">("all");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. Fetch Daily Calculations
  const fetchDailyCalculations = useCallback(async () => {
    setDailyLoading(true);
    try {
      const res = await fetch(`/api/incentives/leadership/calculate?frequency=daily&date=${selectedDate}`);
      const json = await res.json();
      if (json.success) {
        setDailyCalculations(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load daily calculations:", err);
    } finally {
      setDailyLoading(false);
    }
  }, [selectedDate]);

  // 2. Fetch Monthly Calculations
  const fetchMonthlyCalculations = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await fetch(
        `/api/incentives/leadership/calculate?frequency=monthly&month=${selectedMonth}&year=${selectedYear}`
      );
      const json = await res.json();
      if (json.success) {
        setMonthlyCalculations(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load monthly calculations:", err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // 3. Fetch Members, All Agents, and CRM Roster
  const fetchMembersAndAgents = useCallback(async () => {
    setMembersLoading(true);
    try {
      const [memRes, agentRes, rosterRes] = await Promise.all([
        fetch("/api/incentives/leadership/members?includeInactive=1"),
        fetch("/api/incentives/leadership/agents"),
        fetch("/api/incentives/leadership/roster"),
      ]);
      const memJson = await memRes.json();
      const agentJson = await agentRes.json();
      const rosterJson = await rosterRes.json();

      if (memJson.success) setMembers(memJson.data || []);
      if (agentJson.success) setAllAgents(agentJson.data || []);
      if (rosterJson.success) setCrmRoster(rosterJson.data || []);
    } catch (err) {
      console.error("Failed to load leadership members or agents:", err);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Sync real leaders from CRM
  const handleSyncCrmLeaders = async () => {
    setSyncingCrm(true);
    try {
      const res = await fetch("/api/incentives/leadership/sync", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Synced leadership from CRM!");
        await fetchMembersAndAgents();
        await fetchDailyCalculations();
        await fetchMonthlyCalculations();
      } else {
        showToast(json.error || "Failed to sync", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to sync", "error");
    } finally {
      setSyncingCrm(false);
    }
  };

  // 4. Fetch Plans
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const res = await fetch("/api/incentives/leadership/plans");
      const json = await res.json();
      if (json.success) {
        setPlans(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load leadership plans:", err);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDailyCalculations();
    fetchMonthlyCalculations();
    fetchMembersAndAgents();
    fetchPlans();
  }, [fetchDailyCalculations, fetchMonthlyCalculations, fetchMembersAndAgents, fetchPlans]);

  // Active Plan in Configurator
  const activePlanInEditor = useMemo(() => {
    const [role, freq] = selectedPlanKey.split("_daily").length > 1
      ? [selectedPlanKey.replace("_daily", "") as LeadershipRole, "daily" as LeadershipFrequency]
      : [selectedPlanKey.replace("_monthly", "") as LeadershipRole, "monthly" as LeadershipFrequency];

    return plans.find((p) => p.role_target === role && p.frequency === freq);
  }, [plans, selectedPlanKey]);

  // Local draft state for the selected plan in Configurator
  const [planDraft, setPlanDraft] = useState<LeadershipIncentivePlan | null>(null);

  useEffect(() => {
    if (activePlanInEditor) {
      setPlanDraft(JSON.parse(JSON.stringify(activePlanInEditor)));
    } else {
      const [role, freq] = selectedPlanKey.split("_daily").length > 1
        ? [selectedPlanKey.replace("_daily", "") as LeadershipRole, "daily" as LeadershipFrequency]
        : [selectedPlanKey.replace("_monthly", "") as LeadershipRole, "monthly" as LeadershipFrequency];

      setPlanDraft({
        id: 0,
        plan_name: `${role === "manager" ? "Manager" : "Team Leader"} ${freq === "daily" ? "Daily" : "Monthly"} Incentive Plan`,
        role_target: role,
        frequency: freq,
        min_threshold_pct: 100,
        tiers: [
          { tier_order: 1, tier_name: "Tier 1 (100% Target Met)", min_pct: 100, max_pct: 109.99, amount: 500 },
          { tier_order: 2, tier_name: "Tier 2 (110% Accelerator)", min_pct: 110, max_pct: null, amount: 1000 },
        ],
        is_active: true,
      });
    }
  }, [activePlanInEditor, selectedPlanKey]);

  // Save Plan Draft
  const handleSavePlan = async () => {
    if (!planDraft) return;
    setSavingPlan(true);
    try {
      const res = await fetch("/api/incentives/leadership/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planDraft),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Incentive plan updated successfully!");
        fetchPlans();
        fetchDailyCalculations();
        fetchMonthlyCalculations();
      } else {
        showToast(json.error || "Failed to save plan", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save plan", "error");
    } finally {
      setSavingPlan(false);
    }
  };

  // Add Tier to Plan Draft
  const handleAddTier = () => {
    if (!planDraft) return;
    const currentTiers = planDraft.tiers || [];
    const nextOrder = currentTiers.length + 1;
    const lastTier = currentTiers[currentTiers.length - 1];
    const newMin = lastTier ? (lastTier.max_pct ? Math.round((lastTier.max_pct + 0.01) * 100) / 100 : lastTier.min_pct + 10) : 100;
    const newMax = newMin + 9.99;

    const newTier: LeadershipIncentiveTier = {
      tier_order: nextOrder,
      tier_name: `Tier ${nextOrder} (${Math.round(newMin)}% Target)`,
      min_pct: newMin,
      max_pct: newMax,
      amount: lastTier ? lastTier.amount + 500 : 500,
    };

    setPlanDraft({
      ...planDraft,
      tiers: [...currentTiers, newTier],
    });
  };

  // Remove Tier from Plan Draft
  const handleRemoveTier = (idx: number) => {
    if (!planDraft) return;
    const updated = planDraft.tiers.filter((_, i) => i !== idx).map((t, i) => ({
      ...t,
      tier_order: i + 1,
    }));
    setPlanDraft({ ...planDraft, tiers: updated });
  };

  // Save Leader (Create or Update)
  const handleSaveLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeader?.member_name || !editingLeader.member_role) {
      showToast("Please provide leader name and role.", "error");
      return;
    }
    setLeaderFormSaving(true);
    try {
      const isEdit = Boolean(editingLeader.id);
      const url = "/api/incentives/leadership/members";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLeader),
      });
      const json = await res.json();
      if (json.success) {
        showToast(isEdit ? "Leader updated successfully!" : "Leader added successfully!");
        setIsLeaderModalOpen(false);
        setEditingLeader(null);
        fetchMembersAndAgents();
        fetchDailyCalculations();
        fetchMonthlyCalculations();
      } else {
        showToast(json.error || "Operation failed", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save leader", "error");
    } finally {
      setLeaderFormSaving(false);
    }
  };

  // Delete / Deactivate Leader
  const handleDeleteLeader = async (id: number, member_name: string) => {
    if (!confirm(`Are you sure you want to delete ${member_name}? Assigned agents will be unlinked.`)) return;
    try {
      const res = await fetch(`/api/incentives/leadership/members?id=${id}&permanent=1`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        showToast(`${member_name} deleted successfully`);
        fetchMembersAndAgents();
        fetchDailyCalculations();
        fetchMonthlyCalculations();
      } else {
        showToast(json.error || "Failed to delete", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete leader", "error");
    }
  };

  // Open Assign Modal for a Leader
  const handleOpenAssignModal = (leader: LeadershipMember) => {
    setAssigningLeader(leader);
    const existing = new Set<number>((leader.assigned_agents || []).map((a) => a.agent_id));
    setSelectedAgentIds(existing);
    setAssignSearchTerm("");
    setIsAssignModalOpen(true);
  };

  // Toggle Agent Selection in Modal
  const handleToggleAgentSelect = (agentId: number) => {
    const next = new Set(selectedAgentIds);
    if (next.has(agentId)) {
      next.delete(agentId);
    } else {
      next.add(agentId);
    }
    setSelectedAgentIds(next);
  };

  // Save Agent Assignments
  const handleSaveAssignments = async () => {
    if (!assigningLeader) return;
    setSavingAssignments(true);
    try {
      const agentPayload = allAgents
        .filter((a) => selectedAgentIds.has(a.agent_id))
        .map((a) => ({ agent_id: a.agent_id, agent_name: a.agent_name }));

      const res = await fetch("/api/incentives/leadership/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadership_id: assigningLeader.id,
          agents: agentPayload,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Assigned ${agentPayload.length} agent(s) to ${assigningLeader.member_name}`);
        setIsAssignModalOpen(false);
        fetchMembersAndAgents();
        fetchDailyCalculations();
        fetchMonthlyCalculations();
      } else {
        showToast(json.error || "Failed to update assignments", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save assignments", "error");
    } finally {
      setSavingAssignments(false);
    }
  };

  // Filtered Calculations for Daily
  const filteredDaily = useMemo(() => {
    return dailyCalculations.filter((c) => {
      const matchesSearch = c.leader_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" ? true : c.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [dailyCalculations, searchTerm, roleFilter]);

  // Filtered Calculations for Monthly
  const filteredMonthly = useMemo(() => {
    return monthlyCalculations.filter((c) => {
      const matchesSearch = c.leader_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "all" ? true : c.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [monthlyCalculations, searchTerm, roleFilter]);

  // Daily Summary Metrics
  const dailyTotalIncentive = useMemo(
    () => filteredDaily.reduce((sum, c) => sum + c.incentive_amount, 0),
    [filteredDaily]
  );
  const dailyQualifiedCount = useMemo(
    () => filteredDaily.filter((c) => c.is_eligible && c.incentive_amount > 0).length,
    [filteredDaily]
  );
  const dailyTotalTeamTarget = useMemo(
    () => filteredDaily.reduce((sum, c) => sum + c.team_target_points, 0),
    [filteredDaily]
  );
  const dailyTotalTeamAchieved = useMemo(
    () => filteredDaily.reduce((sum, c) => sum + c.team_achieved_points, 0),
    [filteredDaily]
  );
  const dailyOverallPct =
    dailyTotalTeamTarget > 0
      ? Math.round((dailyTotalTeamAchieved / dailyTotalTeamTarget) * 1000) / 10
      : 0;

  // Monthly Summary Metrics
  const monthlyTotalIncentive = useMemo(
    () => filteredMonthly.reduce((sum, c) => sum + c.incentive_amount, 0),
    [filteredMonthly]
  );
  const monthlyQualifiedCount = useMemo(
    () => filteredMonthly.filter((c) => c.is_eligible && c.incentive_amount > 0).length,
    [filteredMonthly]
  );
  const monthlyTotalTeamTarget = useMemo(
    () => filteredMonthly.reduce((sum, c) => sum + c.team_target_points, 0),
    [filteredMonthly]
  );
  const monthlyTotalTeamAchieved = useMemo(
    () => filteredMonthly.reduce((sum, c) => sum + c.team_achieved_points, 0),
    [filteredMonthly]
  );
  const monthlyOverallPct =
    monthlyTotalTeamTarget > 0
      ? Math.round((monthlyTotalTeamAchieved / monthlyTotalTeamTarget) * 1000) / 10
      : 0;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold transition-all transform animate-bounce ${
            statusMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Sub navigation bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-2 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab("daily_calc")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "daily_calc"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Daily Leadership Incentives</span>
          </button>

          <button
            onClick={() => setActiveSubTab("monthly_calc")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "monthly_calc"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Monthly Leadership Incentives</span>
          </button>

          <button
            onClick={() => setActiveSubTab("leaders_team")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "leaders_team"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Leaders & Team Allocations</span>
          </button>

          <button
            onClick={() => setActiveSubTab("plans_config")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "plans_config"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Tier & Slab Configurator</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleSyncCrmLeaders}
            disabled={syncingCrm}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
            title="Automatically sync real Operations Managers and Team Leaders from live CRM"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingCrm ? "animate-spin text-amber-500" : ""}`} />
            <span>{syncingCrm ? "Syncing..." : "Sync from CRM"}</span>
          </button>

          <button
            onClick={() => {
              setEditingLeader({
                member_name: "",
                member_role: "team_leader",
                parent_manager_id: null,
                email: "",
                phone: "",
                notes: "",
                is_active: true,
              });
              setIsLeaderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Leader</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY CALCULATIONS                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === "daily_calc" && (
        <div className="flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs shadow-sm">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-slate-500 dark:text-slate-400">Shift Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer"
                >
                  Yesterday
                </button>
              </div>

              <button
                onClick={fetchDailyCalculations}
                disabled={dailyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dailyLoading ? "animate-spin text-amber-500" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leader..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs outline-none text-slate-800 dark:text-slate-200 focus:border-amber-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="team_leader">Team Leaders</option>
                <option value="manager">Managers</option>
              </select>
            </div>
          </div>

          {/* Daily KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leaders</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {filteredDaily.length}
                </h4>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  {filteredDaily.filter((l) => l.role === "team_leader").length} TLs •{" "}
                  {filteredDaily.filter((l) => l.role === "manager").length} Managers
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Met (≥100%)</p>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {dailyQualifiedCount}{" "}
                  <span className="text-xs font-semibold text-slate-400">/ {filteredDaily.length}</span>
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {filteredDaily.length > 0
                    ? Math.round((dailyQualifiedCount / filteredDaily.length) * 100)
                    : 0}
                  % qualified for incentive
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Incentive Unlocked</p>
                <h4 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {formatINR(dailyTotalIncentive)}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Across all qualified leaders today
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-500">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Team Attainment Pct</p>
                <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatPercentage(dailyOverallPct)}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {dailyTotalTeamAchieved} / {dailyTotalTeamTarget} points
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Daily Calculations Table */}
          <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Operations Leadership Daily Performance & Payouts</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Calculated dynamically from assigned agents&apos; daily target points and achieved points for {selectedDate}. Minimum qualification is 100%.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Leader / Role</th>
                    <th className="py-3 px-4">Team Scope</th>
                    <th className="py-3 px-4 text-center">Team Target</th>
                    <th className="py-3 px-4 text-center">Team Achieved</th>
                    <th className="py-3 px-4 text-center">Attainment %</th>
                    <th className="py-3 px-4 text-center">Unlocked Tier</th>
                    <th className="py-3 px-4 text-right">Incentive Earned</th>
                    <th className="py-3 px-4 text-center">Team Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {dailyLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                        <span>Calculating team points and tiers...</span>
                      </td>
                    </tr>
                  ) : filteredDaily.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold">No leadership calculations found.</p>
                        <p className="text-xs mt-1">
                          Add Team Leaders or Managers in the &quot;Leaders & Team Allocations&quot; tab to start tracking.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredDaily.map((item) => {
                      const isManager = item.role === "manager";
                      const isQualified = item.is_eligible && item.incentive_amount > 0;

                      return (
                        <tr
                          key={item.leader_id}
                          className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isManager
                                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {isManager ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                  {item.leader_name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isManager
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    }`}
                                  >
                                    {isManager ? "Manager" : "Team Leader"}
                                  </span>
                                  {!isManager && item.parent_manager_name && (
                                    <span className="text-[11px] text-slate-400">
                                      under {item.parent_manager_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.team_size} Agents Assigned
                              </span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                {item.team_present_count} on floor today
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {item.team_target_points} pts
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {item.team_achieved_points} pts
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={`text-xs font-black ${
                                  item.team_achievement_pct >= 130
                                    ? "text-purple-600 dark:text-purple-400"
                                    : item.team_achievement_pct >= 120
                                    ? "text-cyan-600 dark:text-cyan-400"
                                    : item.team_achievement_pct >= 110
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : item.team_achievement_pct >= 100
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-500 dark:text-rose-400"
                                }`}
                              >
                                {formatPercentage(item.team_achievement_pct)}
                              </span>
                              <div className="w-20 bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${
                                    item.team_achievement_pct >= 100
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(item.team_achievement_pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isQualified && item.unlocked_tier ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                {item.unlocked_tier.tier_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                <XCircle className="w-3 h-3 text-slate-400" />
                                Below 100% Target
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`text-sm font-black ${
                                isQualified
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {formatINR(item.incentive_amount)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedBreakdownDaily(item)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Team</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY CALCULATIONS                                               */}
      {/* ========================================================================= */}
      {activeSubTab === "monthly_calc" && (
        <div className="flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs shadow-sm">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-slate-500 dark:text-slate-400">Target Month:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1} className="dark:bg-slate-800">
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer ml-1"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y} className="dark:bg-slate-800">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchMonthlyCalculations}
                disabled={monthlyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${monthlyLoading ? "animate-spin text-purple-500" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search leader..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs outline-none text-slate-800 dark:text-slate-200 focus:border-purple-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="team_leader">Team Leaders</option>
                <option value="manager">Managers</option>
              </select>
            </div>
          </div>

          {/* Monthly KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Leaders</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                  {filteredMonthly.length}
                </h4>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                  {filteredMonthly.filter((l) => l.role === "team_leader").length} TLs •{" "}
                  {filteredMonthly.filter((l) => l.role === "manager").length} Managers
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-500">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Met (≥100%)</p>
                <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {monthlyQualifiedCount}{" "}
                  <span className="text-xs font-semibold text-slate-400">/ {filteredMonthly.length}</span>
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {filteredMonthly.length > 0
                    ? Math.round((monthlyQualifiedCount / filteredMonthly.length) * 100)
                    : 0}
                  % qualified for monthly incentive
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Payout Projected</p>
                <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {formatINR(monthlyTotalIncentive)}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  Across all qualified leaders this month
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-500">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Attainment Pct</p>
                <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {formatPercentage(monthlyOverallPct)}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {monthlyTotalTeamAchieved} / {monthlyTotalTeamTarget} points
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-500">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Monthly Table */}
          <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-500" />
                <span>Monthly Team Points Target Attainment & Incentive Calculation</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates assigned monthly targets vs actual monthly points accumulated across all assigned operations team members.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Leader / Role</th>
                    <th className="py-3 px-4">Team Size</th>
                    <th className="py-3 px-4 text-center">Monthly Target</th>
                    <th className="py-3 px-4 text-center">Monthly Achieved</th>
                    <th className="py-3 px-4 text-center">Attainment %</th>
                    <th className="py-3 px-4 text-center">Unlocked Slab</th>
                    <th className="py-3 px-4 text-right">Monthly Incentive</th>
                    <th className="py-3 px-4 text-center">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {monthlyLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
                        <span>Calculating monthly aggregates...</span>
                      </td>
                    </tr>
                  ) : filteredMonthly.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-semibold">No monthly calculations found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMonthly.map((item) => {
                      const isManager = item.role === "manager";
                      const isQualified = item.is_eligible && item.incentive_amount > 0;

                      return (
                        <tr
                          key={item.leader_id}
                          className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  isManager
                                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {isManager ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                  {item.leader_name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isManager
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    }`}
                                  >
                                    {isManager ? "Manager" : "Team Leader"}
                                  </span>
                                  {!isManager && item.parent_manager_name && (
                                    <span className="text-[11px] text-slate-400">
                                      under {item.parent_manager_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {item.team_size} Agents
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {item.team_target_points.toLocaleString()} pts
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {item.team_achieved_points.toLocaleString()} pts
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center">
                              <span
                                className={`text-xs font-black ${
                                  item.team_achievement_pct >= 130
                                    ? "text-purple-600 dark:text-purple-400"
                                    : item.team_achievement_pct >= 120
                                    ? "text-cyan-600 dark:text-cyan-400"
                                    : item.team_achievement_pct >= 110
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : item.team_achievement_pct >= 100
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-500 dark:text-rose-400"
                                }`}
                              >
                                {formatPercentage(item.team_achievement_pct)}
                              </span>
                              <div className="w-20 bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className={`h-full rounded-full ${
                                    item.team_achievement_pct >= 100
                                      ? "bg-gradient-to-r from-purple-500 to-indigo-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(item.team_achievement_pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isQualified && item.unlocked_tier ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-bold">
                                <Sparkles className="w-3 h-3 text-purple-500" />
                                {item.unlocked_tier.tier_name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                <XCircle className="w-3 h-3 text-slate-400" />
                                Below 100% Target
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`text-sm font-black ${
                                isQualified
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {formatINR(item.incentive_amount)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedBreakdownMonthly(item)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Team</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEADERS & TEAM ALLOCATIONS                                         */}
      {/* ========================================================================= */}
      {activeSubTab === "leaders_team" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Operations Leadership Roster & Team Allocations</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Assign operations agents to Team Leaders and configure reporting Manager hierarchies.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingLeader({
                  member_name: "",
                  member_role: "team_leader",
                  parent_manager_id: null,
                  email: "",
                  phone: "",
                  notes: "",
                  is_active: true,
                });
                setIsLeaderModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Leader</span>
            </button>
          </div>

          {/* Leaders List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {membersLoading ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                <span>Loading leadership roster...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold">No leaders added yet.</p>
                <p className="text-xs mt-1">Click &quot;Add New Leader&quot; to configure your first Team Leader or Manager.</p>
              </div>
            ) : (
              members.map((member) => {
                const isManager = member.member_role === "manager";
                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                              isManager
                                ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isManager ? <Crown className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                              {member.member_name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isManager
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                }`}
                              >
                                {isManager ? "Manager" : "Team Leader"}
                              </span>
                              {member.crm_user_id && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                  CRM ID: #{member.crm_user_id}
                                </span>
                              )}
                              {!isManager && member.parent_manager_name && (
                                <span className="text-[11px] text-slate-400">
                                  under {member.parent_manager_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingLeader(member);
                              setIsLeaderModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Edit Leader"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLeader(member.id, member.member_name)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Leader"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contact / Notes */}
                      {(member.email || member.phone) && (
                        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          {member.email && <span>📧 {member.email}</span>}
                          {member.phone && <span>📞 {member.phone}</span>}
                        </div>
                      )}

                      {/* Team Members Summary */}
                      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            Assigned Team Members:
                          </span>
                          <span className="font-black text-blue-600 dark:text-blue-400">
                            {member.assigned_agents?.length || 0} Agents
                          </span>
                        </div>

                        {/* Agents Chips */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {member.assigned_agents && member.assigned_agents.length > 0 ? (
                            member.assigned_agents.map((ag) => (
                              <span
                                key={ag.agent_id}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                              >
                                {ag.agent_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No agents assigned yet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-end">
                      <button
                        onClick={() => handleOpenAssignModal(member)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition-all cursor-pointer border border-blue-200/60 dark:border-blue-500/20"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign / Manage Team Members</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TIER & SLAB CONFIGURATOR                                           */}
      {/* ========================================================================= */}
      {activeSubTab === "plans_config" && (
        <div className="flex flex-col gap-6">
          {/* Plan Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>Configure Leadership Incentive Plans & Tiers</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set minimum qualifying team percentage thresholds and multi-tiered payout amounts for Team Leaders and Managers.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: "team_leader_daily", label: "TL Daily" },
                { key: "team_leader_monthly", label: "TL Monthly" },
                { key: "manager_daily", label: "Manager Daily" },
                { key: "manager_monthly", label: "Manager Monthly" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlanKey(p.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedPlanKey === p.key
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {planDraft && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 shadow-sm flex flex-col gap-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    value={planDraft.plan_name}
                    onChange={(e) => setPlanDraft({ ...planDraft, plan_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Target Role & Frequency
                  </label>
                  <div className="mt-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    {planDraft.role_target.replace("_", " ")} • {planDraft.frequency}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Minimum Qualification Threshold (%)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={planDraft.min_threshold_pct}
                      onChange={(e) =>
                        setPlanDraft({ ...planDraft, min_threshold_pct: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Team overall points achieved must be $\ge$ this threshold to unlock tier rewards.
                  </p>
                </div>
              </div>

              {/* Tiers List */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Performance Tiers / Slabs
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure progressive incentive amounts for achieving 100%, 110%, 120%, 130%+, etc.
                    </p>
                  </div>

                  <button
                    onClick={handleAddTier}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold border border-emerald-500/20 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier Slab</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase">
                        <th className="py-2.5 px-3 w-16">Tier #</th>
                        <th className="py-2.5 px-3">Tier Name</th>
                        <th className="py-2.5 px-3 w-28">Min Attainment %</th>
                        <th className="py-2.5 px-3 w-28">Max Attainment %</th>
                        <th className="py-2.5 px-3 w-36">Incentive Payout (₹)</th>
                        <th className="py-2.5 px-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {planDraft.tiers.map((tier, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                            #{tier.tier_order}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={tier.tier_name}
                              onChange={(e) => {
                                const updated = [...planDraft.tiers];
                                updated[idx].tier_name = e.target.value;
                                setPlanDraft({ ...planDraft, tiers: updated });
                              }}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-medium outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              value={tier.min_pct}
                              onChange={(e) => {
                                const updated = [...planDraft.tiers];
                                updated[idx].min_pct = parseFloat(e.target.value) || 0;
                                setPlanDraft({ ...planDraft, tiers: updated });
                              }}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="No limit (+)"
                              value={tier.max_pct !== null && tier.max_pct !== undefined ? tier.max_pct : ""}
                              onChange={(e) => {
                                const updated = [...planDraft.tiers];
                                const val = e.target.value.trim();
                                updated[idx].max_pct = val === "" ? null : parseFloat(val);
                                setPlanDraft({ ...planDraft, tiers: updated });
                              }}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                              <input
                                type="number"
                                step="50"
                                value={tier.amount}
                                onChange={(e) => {
                                  const updated = [...planDraft.tiers];
                                  updated[idx].amount = parseInt(e.target.value, 10) || 0;
                                  setPlanDraft({ ...planDraft, tiers: updated });
                                }}
                                className="w-full pl-6 pr-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-black text-emerald-600 dark:text-emerald-400 outline-none focus:border-emerald-500"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => handleRemoveTier(idx)}
                              disabled={planDraft.tiers.length <= 1}
                              className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 cursor-pointer"
                              title="Delete Tier"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Save Plan Button */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <button
                  onClick={handleSavePlan}
                  disabled={savingPlan}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {savingPlan ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Plan Configuration</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT LEADER                                                */}
      {/* ========================================================================= */}
      {isLeaderModalOpen && editingLeader && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                  {editingLeader.id ? "Edit Leadership Member" : "Add Operations Leader"}
                </h3>
              </div>
              <button
                onClick={() => setIsLeaderModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeader} className="p-5 flex flex-col gap-4 text-xs">
              {/* CRM Employee Auto-fill Selection */}
              {crmRoster.length > 0 && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Select from Real CRM Roster</span>
                    <span className="text-[10px] text-amber-500 font-semibold">Auto-fills details</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = Number(e.target.value);
                      if (!selectedId) return;
                      const emp = crmRoster.find((r) => r.id === selectedId);
                      if (emp) {
                        const isMgr =
                          emp.normalized_role === "manager" ||
                          emp.role.toLowerCase().includes("operations_manager");
                        setEditingLeader({
                          ...editingLeader,
                          member_name: emp.name,
                          crm_user_id: emp.id,
                          member_role: isMgr ? "manager" : "team_leader",
                          email: `${emp.name.toLowerCase().replace(/\s+/g, ".")}@demandflow.io`,
                          notes: `CRM Role: ${emp.role} (${emp.department})`,
                        });
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 font-semibold outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Choose real CRM employee --</option>
                    {crmRoster.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (CRM ID: {emp.id}) — {emp.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={editingLeader.member_name || ""}
                  onChange={(e) => setEditingLeader({ ...editingLeader, member_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 font-semibold outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLeader({ ...editingLeader, member_role: "team_leader" })}
                    className={`py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      editingLeader.member_role === "team_leader"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                        : "border-slate-200 dark:border-white/10 text-slate-500"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Team Leader</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingLeader({ ...editingLeader, member_role: "manager" })}
                    className={`py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      editingLeader.member_role === "manager"
                        ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400"
                        : "border-slate-200 dark:border-white/10 text-slate-500"
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Manager</span>
                  </button>
                </div>
              </div>

              {editingLeader.member_role === "team_leader" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Reporting Manager (Optional)
                  </label>
                  <select
                    value={editingLeader.parent_manager_id || ""}
                    onChange={(e) =>
                      setEditingLeader({
                        ...editingLeader,
                        parent_manager_id: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 font-semibold outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">None / Reports Directly</option>
                    {members
                      .filter((m) => m.member_role === "manager" && m.id !== editingLeader.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.member_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={editingLeader.email || ""}
                    onChange={(e) => setEditingLeader({ ...editingLeader, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={editingLeader.phone || ""}
                    onChange={(e) => setEditingLeader({ ...editingLeader, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsLeaderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaderFormSaving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {leaderFormSaving ? "Saving..." : "Save Leader"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASSIGN TEAM MEMBERS                                              */}
      {/* ========================================================================= */}
      {isAssignModalOpen && assigningLeader && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    Assign Agents to {assigningLeader.member_name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Role: <span className="font-bold uppercase">{assigningLeader.member_role.replace("_", " ")}</span> • Currently selected: {selectedAgentIds.size} agents
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Bulk Select */}
            <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search agents by name..."
                  value={assignSearchTerm}
                  onChange={(e) => setAssignSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = new Set(allAgents.map((a) => a.agent_id));
                    setSelectedAgentIds(allIds);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAgentIds(new Set())}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Agents List with Checkboxes */}
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 flex-1">
              {allAgents
                .filter((a) => a.agent_name.toLowerCase().includes(assignSearchTerm.toLowerCase()))
                .map((agent) => {
                  const isChecked = selectedAgentIds.has(agent.agent_id);
                  const assignedTo = agent.currently_assigned_to;
                  const isAssignedToOther =
                    assignedTo && assignedTo.leader_id !== assigningLeader.id;

                  return (
                    <label
                      key={agent.agent_id}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        isChecked ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAgentSelect(agent.agent_id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {agent.agent_name}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            ID: {agent.agent_id}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isAssignedToOther && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-[10px] text-slate-500 font-medium">
                            currently under {assignedTo.leader_name} ({assignedTo.role === "manager" ? "Mgr" : "TL"})
                          </span>
                        )}
                        {isChecked && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold ml-1.5">
                            Assigned
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedAgentIds.size} agents will report to this leader.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={savingAssignments}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {savingAssignments ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: DAILY TEAM BREAKDOWN                                      */}
      {/* ========================================================================= */}
      {selectedBreakdownDaily && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    {selectedBreakdownDaily.leader_name} — Team Performance Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Shift Date: {selectedBreakdownDaily.work_date} • Team Attainment:{" "}
                  <span className="font-bold text-emerald-500">
                    {formatPercentage(selectedBreakdownDaily.team_achievement_pct)}
                  </span>{" "}
                  ({selectedBreakdownDaily.team_achieved_points} / {selectedBreakdownDaily.team_target_points} pts)
                </p>
              </div>
              <button
                onClick={() => setSelectedBreakdownDaily(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase">
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Target Points</th>
                    <th className="py-2.5 px-3 text-center">Achieved Points</th>
                    <th className="py-2.5 px-3 text-center">Attainment %</th>
                    <th className="py-2.5 px-3 text-center">Qualified Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {selectedBreakdownDaily.team_members.map((tm) => (
                    <tr key={tm.agent_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {tm.agent_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tm.is_present
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {tm.attendance_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {tm.target_points} pts
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {tm.achieved_points} pts
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-black ${
                            tm.completion_pct >= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {formatPercentage(tm.completion_pct)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                        {tm.qualified_leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-400">Unlocked Tier: </span>
                <span className="font-black text-amber-500 ml-1">
                  {selectedBreakdownDaily.unlocked_tier?.tier_name || "None (Below 100%)"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-400">Daily Payout: </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm ml-1">
                  {formatINR(selectedBreakdownDaily.incentive_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: MONTHLY TEAM BREAKDOWN                                    */}
      {/* ========================================================================= */}
      {selectedBreakdownMonthly && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-purple-500" />
                  <h3 className="font-bold text-slate-800 dark:text-white text-base">
                    {selectedBreakdownMonthly.leader_name} — Monthly Team Target Breakdown
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Period: {selectedBreakdownMonthly.month}/{selectedBreakdownMonthly.year} • Team Attainment:{" "}
                  <span className="font-bold text-purple-500">
                    {formatPercentage(selectedBreakdownMonthly.team_achievement_pct)}
                  </span>{" "}
                  ({selectedBreakdownMonthly.team_achieved_points.toLocaleString()} /{" "}
                  {selectedBreakdownMonthly.team_target_points.toLocaleString()} pts)
                </p>
              </div>
              <button
                onClick={() => setSelectedBreakdownMonthly(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase">
                    <th className="py-2.5 px-3">Agent</th>
                    <th className="py-2.5 px-3 text-center">Days Present</th>
                    <th className="py-2.5 px-3 text-center">Monthly Target</th>
                    <th className="py-2.5 px-3 text-center">Achieved Points</th>
                    <th className="py-2.5 px-3 text-center">Attainment %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {selectedBreakdownMonthly.team_members.map((tm) => (
                    <tr key={tm.agent_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {tm.agent_name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {tm.working_days_present} days
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {tm.assigned_monthly_target.toLocaleString()} pts
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {tm.achieved_monthly_points.toLocaleString()} pts
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-black ${
                            tm.achievement_pct >= 100
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-500"
                          }`}
                        >
                          {formatPercentage(tm.achievement_pct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-400">Unlocked Slab: </span>
                <span className="font-black text-purple-500 ml-1">
                  {selectedBreakdownMonthly.unlocked_tier?.tier_name || "None (Below 100%)"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 dark:text-slate-400">Monthly Payout: </span>
                <span className="font-black text-purple-600 dark:text-purple-400 text-sm ml-1">
                  {formatINR(selectedBreakdownMonthly.incentive_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

