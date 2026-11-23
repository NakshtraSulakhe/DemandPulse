"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Award,
  Sliders,
  FileCheck2,
  Coins,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Calculator,
  Pencil,
} from "lucide-react";
import QaIncentivePlanCreator from "@/components/incentives/qa-incentive-plan-creator";
import QaIncentiveCalculatorView from "@/components/incentives/qa-incentive-calculator-view";
import CampaignPointsEditor from "@/components/productivity/campaign-points-editor";
import { QaIncentivePlan } from "@/types/qa-incentives";

export default function QaIncentivesPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "calculator" | "points">("builder");
  const [editingPlan, setEditingPlan] = useState<QaIncentivePlan | null>(null);

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-cyan-600 transition-colors">
            Admin
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href="/admin/incentives" className="hover:text-cyan-600 transition-colors">
            Incentive Hub
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-900 dark:text-white">QA Incentive Plans</span>
        </div>

        <Link
          href="/admin/incentives"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incentive Hub</span>
        </Link>
      </div>

      {/* Main Tab Controller */}
      <div className="flex flex-wrap items-center gap-3 p-1.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("builder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "builder"
              ? "bg-cyan-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {editingPlan ? <Pencil className="w-4 h-4 text-cyan-200" /> : <Sliders className="w-4 h-4" />}
          <span>
            {editingPlan
              ? `Edit Plan #${editingPlan.id} (${editingPlan.frequency})`
              : "Plan Builder & Configuration"}
          </span>
        </button>

        {editingPlan && (
          <button
            onClick={() => {
              setEditingPlan(null);
              setActiveTab("builder");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Switch to creating a new plan"
          >
            <span>+ New Plan</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("calculator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "calculator"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>QA Team Live Audit Calculations</span>
        </button>

        <button
          onClick={() => setActiveTab("points")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "points"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>QA Campaign Point Multipliers</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "builder" ? (
        <QaIncentivePlanCreator
          initialPlan={editingPlan}
          onPlanSaved={() => {
            setEditingPlan(null);
            setActiveTab("calculator");
          }}
          onCancel={() => {
            setEditingPlan(null);
            setActiveTab("calculator");
          }}
        />
      ) : activeTab === "calculator" ? (
        <QaIncentiveCalculatorView
          onEditPlan={(plan) => {
            setEditingPlan(plan);
            setActiveTab("builder");
          }}
        />
      ) : (
        <CampaignPointsEditor />
      )}
    </div>
  );
}

