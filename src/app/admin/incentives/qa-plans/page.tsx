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
} from "lucide-react";
import QaIncentivePlanCreator from "@/components/incentives/qa-incentive-plan-creator";
import QaIncentiveCalculatorView from "@/components/incentives/qa-incentive-calculator-view";

export default function QaIncentivesPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "calculator">("builder");

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
      <div className="flex items-center gap-3 p-1.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 w-fit">
        <button
          onClick={() => setActiveTab("builder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "builder"
              ? "bg-cyan-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Plan Builder & Configuration</span>
        </button>

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
      </div>

      {/* Tab Contents */}
      {activeTab === "builder" ? (
        <QaIncentivePlanCreator onPlanSaved={() => setActiveTab("calculator")} />
      ) : (
        <QaIncentiveCalculatorView />
      )}
    </div>
  );
}

