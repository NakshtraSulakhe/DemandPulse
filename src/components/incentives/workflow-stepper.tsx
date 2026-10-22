"use client";

import React from "react";
import {
  ClipboardCheck,
  Award,
  Calculator,
  CalendarCheck2,
  UserCheck,
  SendHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "completed" | "in_progress" | "pending" | "alert";
  timestamp?: string;
  metric?: string;
}

interface WorkflowStepperProps {
  settled: boolean;
  eligibleCount: number;
  totalIncentive: number;
  approvedCount: number;
  paidCount: number;
  processingCount?: number;
  workDate: string;
}

export default function IncentiveWorkflowStepper({
  settled,
  eligibleCount,
  totalIncentive,
  approvedCount,
  paidCount,
  processingCount = 0,
  workDate,
}: WorkflowStepperProps) {
  const steps: WorkflowStep[] = [
    {
      id: "qa_audit",
      label: "QA Lead Audit",
      sublabel: "Scored & Compliance Verified",
      icon: ClipboardCheck,
      status: "completed",
      metric: "Audited",
    },
    {
      id: "points_earned",
      label: "Points Evaluated",
      sublabel: "Target vs Achieved Calculated",
      icon: Award,
      status: "completed",
      metric: `${eligibleCount} Met Target`,
    },
    {
      id: "incentive_calc",
      label: "Incentive Calculated",
      sublabel: "Base ₹500 + Tiered Slabs",
      icon: Calculator,
      status: "completed",
      metric: `₹${totalIncentive.toLocaleString("en-IN")}`,
    },
    {
      id: "settlement",
      label: "Daily Settlement",
      sublabel: settled ? "Finalized Cutoff" : "Provisional / Pending Cutoff",
      icon: CalendarCheck2,
      status: settled ? "completed" : "in_progress",
      metric: settled ? "Finalized" : "Provisional",
    },
    {
      id: "manager_approval",
      label: "Manager Approval",
      sublabel: approvedCount > 0 ? `${approvedCount} Approved` : "Awaiting Review",
      icon: UserCheck,
      status: approvedCount > 0 ? "completed" : settled ? "in_progress" : "pending",
      metric: `${approvedCount} Signed`,
    },
    {
      id: "disbursement",
      label: "Bank / UPI Payout",
      sublabel: processingCount > 0 ? "Processing Transfers" : paidCount > 0 ? `${paidCount} Disbursed` : "Ready to Pay",
      icon: SendHorizontal,
      status: processingCount > 0 ? "in_progress" : paidCount > 0 ? "completed" : "pending",
      metric: processingCount > 0 ? "In Flight" : `${paidCount} Paid`,
    },
    {
      id: "reconciled",
      label: "Payroll Reconciled",
      sublabel: "Monthly Salary Offset",
      icon: CheckCircle2,
      status: paidCount > 0 ? "completed" : "pending",
      metric: "hr/payroll.php",
    },
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            End-to-End Automated Incentive Pipeline
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Operational pipeline tracking QA auditing, settlement cutoff, manager approval, and payment dispatch for {workDate}
          </p>
        </div>
        <div className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
          Automated Cron: 01:00 AM Daily
        </div>
      </div>

      {/* Stepper Timeline */}
      <div className="relative overflow-x-auto py-2">
        <div className="flex items-start justify-between min-w-[760px] gap-2 relative">
          {/* Connector line behind steps */}
          <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === "completed";
            const isInProgress = step.status === "in_progress";
            const isAlert = step.status === "alert";

            return (
              <div key={step.id} className="flex-1 flex flex-col items-center text-center relative z-10 px-1">
                {/* Step Circle */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                    isCompleted
                      ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/20"
                      : isInProgress
                      ? "bg-gradient-to-tr from-cyan-600 to-blue-500 text-white ring-4 ring-cyan-500/20 animate-pulse shadow-cyan-500/20"
                      : isAlert
                      ? "bg-rose-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Step Info */}
                <div className="mt-2.5 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {step.sublabel}
                  </span>
                  {step.metric && (
                    <span
                      className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isCompleted
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                          : isInProgress
                          ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30"
                          : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {step.metric}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
