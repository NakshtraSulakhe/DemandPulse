"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sliders,
  Target,
  Award,
  ShieldCheck,
  Trophy,
  FileCheck2,
  Coins,
  CheckCircle2,
  CreditCard,
  History,
  FileText,
  Users,
  Calculator,
  ChevronRight,
} from "lucide-react";

interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths?: string[];
}

const STAGE_GROUPS: Array<{
  stage: string;
  title: string;
  subtitle: string;
  accent: string;
  badgeClass: string;
  items: NavLinkItem[];
}> = [
  {
    stage: "1",
    title: "Configure",
    subtitle: "Rules, targets & plans",
    accent: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    items: [
      {
        label: "Policy & Slabs",
        href: "/admin/incentive-config",
        icon: Sliders,
        matchPaths: ["/admin/incentive-config", "/admin/incentive-config/policies", "/admin/incentive-config/assignments", "/admin/incentives/config"],
      },
      {
        label: "Targets & Points",
        href: "/admin/incentives?tab=targets",
        icon: Target,
      },
      {
        label: "QA Plans",
        href: "/admin/incentives/qa-plans",
        icon: Award,
      },
      {
        label: "Leadership Plans",
        href: "/admin/incentives/leadership",
        icon: ShieldCheck,
      },
    ],
  },
  {
    stage: "2",
    title: "Calculate & Check",
    subtitle: "Live preview & audits",
    accent: "text-cyan-600 dark:text-cyan-400",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
    items: [
      {
        label: "Daily Achievers",
        href: "/admin/incentives",
        icon: Trophy,
      },
      {
        label: "QA Audit Calc",
        href: "/admin/incentives?tab=qa_audits",
        icon: Calculator,
      },
      {
        label: "Monthly Tracker",
        href: "/admin/incentives?tab=monthly",
        icon: Coins,
      },
    ],
  },
  {
    stage: "3",
    title: "Review & Settle",
    subtitle: "Approvals, payroll & logs",
    accent: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    items: [
      {
        label: "Settlements",
        href: "/admin/incentives/settlements",
        icon: FileCheck2,
        matchPaths: ["/admin/incentives/settlements", "/admin/incentives/daily"],
      },
      {
        label: "Approvals",
        href: "/admin/incentives/approvals",
        icon: CheckCircle2,
        matchPaths: ["/admin/incentives/approvals", "/admin/incentive-config/approvals"],
      },
      {
        label: "Payroll & Payouts",
        href: "/admin/incentives/payroll",
        icon: CreditCard,
        matchPaths: ["/admin/incentives/payroll", "/admin/incentives/disbursements", "/admin/incentives/beneficiaries"],
      },
      {
        label: "History",
        href: "/admin/incentives/history",
        icon: History,
        matchPaths: ["/admin/incentives/history", "/admin/incentive-config/history"],
      },
    ],
  },
];

export default function IncentiveWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isItemActive = (item: NavLinkItem) => {
    const baseHref = item.href.split("?")[0];
    if (item.matchPaths) {
      return item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
    }
    if (item.href.includes("?")) return false;
    return pathname === baseHref;
  };

  // Show contextual quick-links when inside /admin/incentive-config
  const isPolicySection = pathname.startsWith("/admin/incentive-config") || pathname === "/admin/incentives/config";

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Unified 3-Stage Incentive Navigation */}
      <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 p-3.5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {STAGE_GROUPS.map((group) => (
            <div
              key={group.stage}
              className="rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/10 p-2.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center border ${group.badgeClass}`}
                  >
                    {group.stage}
                  </span>
                  <span className={`text-xs font-extrabold tracking-tight ${group.accent}`}>
                    {group.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {group.subtitle}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        active
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                          : "bg-white dark:bg-[#0c1322] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sub-bar when inside Policy & Rules */}
        {isPolicySection && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-white/10 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5" />
              Policy & Rule Views:
            </span>
            {[
              { label: "Overview", href: "/admin/incentive-config", icon: Sliders },
              { label: "All Policies & Slabs", href: "/admin/incentive-config/policies", icon: FileText },
              { label: "Agent Assignments", href: "/admin/incentive-config/assignments", icon: Users },
              { label: "Policy Approvals", href: "/admin/incentive-config/approvals", icon: CheckCircle2 },
              { label: "Quick Rules Editor", href: "/admin/incentives/config", icon: Coins },
              { label: "Audit Log", href: "/admin/incentive-config/history", icon: History },
            ].map((sub) => {
              const SubIcon = sub.icon;
              const subActive = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    subActive
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <SubIcon className="w-3 h-3" />
                  <span>{sub.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Page Content */}
      {children}
    </div>
  );
}
