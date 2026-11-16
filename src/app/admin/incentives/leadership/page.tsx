"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, ChevronRight } from "lucide-react";
import LeadershipIncentiveHub from "@/components/incentives/leadership-incentive-hub";

export default function LeadershipIncentiveConsolePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-8 flex flex-col gap-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Link
              href="/admin/incentives"
              className="hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Incentives Hub</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-amber-600 dark:text-amber-400">Operations Leadership</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span>Operations Leadership Incentive Console</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage Team Leaders & Operations Managers, assign operations agents, and calculate daily & monthly team point achievement incentives.
          </p>
        </div>

        <Link
          href="/admin/incentives"
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hub</span>
        </Link>
      </div>

      {/* Main Leadership Component */}
      <LeadershipIncentiveHub />
    </div>
  );
}

