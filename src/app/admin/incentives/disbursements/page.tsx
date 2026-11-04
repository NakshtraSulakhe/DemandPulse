"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function DisbursementsRemovedPage() {
  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[50vh] p-6 text-center animate-fadeIn">
      <div className="p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        Payment Disbursement Removed
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">
        The automatic incentive payment and disbursement feature has been removed from this project. Incentive targets and policies are configured under Incentive Configuration.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <Link
          href="/admin/incentive-config"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Incentive Configuration</span>
        </Link>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
        >
          Admin Home
        </Link>
      </div>
    </div>
  );
}
