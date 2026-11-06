"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trophy,
  Award,
  Sparkles,
  TrendingUp,
  Coins,
  Search,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronDown,
  AlertCircle,
  Percent,
} from "lucide-react";
import { formatINR } from "@/lib/incentives/formatters";

interface AchieverAgent {
  agent_id: number;
  agent_name: string;
  role: string;
  work_date: string;
  target_points: number;
  achieved_points: number;
  completion_pct: number;
  qualified_leads: number;
  disqualified_leads: number;
  base_incentive: number;
  slab_incentive: number;
  total_incentive: number;
  attendance_status: string;
  eligibility_status: string;
  eligibility_reason: string;
  is_settled: boolean;
}

interface AchieversResponse {
  success: boolean;
  work_date: string;
  is_settled: boolean;
  summary: {
    total_achievers: number;
    total_incentive_earned: number;
    average_incentive: number;
    top_performer: {
      name: string;
      achieved_points: number;
      total_incentive: number;
    } | null;
  };
  achievers: AchieverAgent[];
}

export default function AgentIncentiveAchievers() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minIncentiveFilter, setMinIncentiveFilter] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AchieversResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incentives/achievers?date=${encodeURIComponent(selectedDate)}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load agent incentive data");
      }
    } catch (err: any) {
      setError(err?.message || "Error connecting to CRM incentive pipeline");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAchievers();
  }, [fetchAchievers]);

  const achievers = data?.achievers || [];
  const summary = data?.summary;

  const filteredAchievers = useMemo(() => {
    return achievers.filter((a) => {
      const matchesSearch =
        a.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(a.agent_id).includes(searchTerm) ||
        a.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMin = a.total_incentive >= minIncentiveFilter;
      return matchesSearch && matchesMin;
    });
  }, [achievers, searchTerm, minIncentiveFilter]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Top Header & Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Coins className="w-3 h-3" /> Live CRM Incentive Feed
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Direct Endpoint Sync</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Today&apos;s Agent Incentive Achievers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agents who unlocked daily cash incentives by reaching 100%+ target quota, fetched directly from DemandFlow CRM.
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono"
            />
          </div>

          <button
            onClick={fetchAchievers}
            disabled={loading}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh CRM Achievers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Incentive Earned</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(summary?.total_incentive_earned || 0)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {data?.is_settled ? "Finalized settlement payout" : "Provisional live QA audits"}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Quota Achievers Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            {summary?.total_achievers || 0} Agents
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Reached 100%+ daily quota requirement
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Average Payout / Achiever</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
            {formatINR(summary?.average_incentive || 0)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Base ₹500 + accelerator slabs
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Top Earner Today</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-extrabold truncate text-slate-900 dark:text-white">
            {summary?.top_performer?.name || "None yet"}
          </div>
          <p className="mt-1 text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold">
            {summary?.top_performer ? formatINR(summary.top_performer.total_incentive) : "—"}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-80 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search achiever by agent name, role, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500">Filter Payout:</span>
          <button
            onClick={() => setMinIncentiveFilter(0)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              minIncentiveFilter === 0
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Achievers ({achievers.length})
          </button>
          <button
            onClick={() => setMinIncentiveFilter(700)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              minIncentiveFilter === 700
                ? "bg-amber-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            ₹700+
          </button>
          <button
            onClick={() => setMinIncentiveFilter(850)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              minIncentiveFilter === 850
                ? "bg-purple-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            ₹850+ (High Slabs)
          </button>
        </div>
      </div>

      {/* Achievers Cards & Table Grid */}
      {loading ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-500">Fetching live agent incentives from DemandFlow CRM API...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      ) : filteredAchievers.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center text-slate-500 text-xs">
          No agent has reached the 100% quota threshold for the selected filters today yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievers.map((agent, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={agent.agent_id}
                className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3 relative overflow-hidden group shadow-sm hover:shadow-md"
              >
                {/* Accent Banner for Top Rankers */}
                {isTop3 && (
                  <div className="absolute top-0 right-0 px-3 py-0.5 bg-gradient-to-l from-amber-500 to-amber-600 text-[10px] font-black uppercase text-white rounded-bl-xl tracking-wider flex items-center gap-1 shadow-sm">
                    <Trophy className="w-2.5 h-2.5" /> Rank #{index + 1}
                  </div>
                )}

                {/* Agent Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                    {agent.agent_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {agent.agent_name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>ID: #{agent.agent_id}</span>
                      <span>•</span>
                      <span className="truncate">{agent.role}</span>
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="space-y-1.5 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Target vs Achieved</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {agent.achieved_points} / {agent.target_points} pts ({agent.completion_pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(agent.completion_pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Verified Leads: {agent.qualified_leads}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                      Quota Achieved
                    </span>
                  </div>
                </div>

                {/* Financial Breakdown Strip */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80 dark:border-white/5 text-center">
                  <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-white/5">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Base</span>
                    <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formatINR(agent.base_incentive)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                    <span className="text-[10px] uppercase font-semibold">Slab Bonus</span>
                    <div className="text-xs font-mono font-bold">
                      +{formatINR(agent.slab_incentive)}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    <span className="text-[10px] uppercase font-bold">Total Cash</span>
                    <div className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatINR(agent.total_incentive)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

