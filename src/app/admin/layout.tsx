"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  History,
  Settings,
  Tv,
  LogOut,
  ChevronRight,
  Shield,
  Activity,
  Server,
  Menu,
  X,
  Coins,
  FileCheck2,
  CalendarCheck2,
  UserCheck,
  SendHorizontal,
  Building,
  FileSpreadsheet,
  Clock,
  Sliders,
} from "lucide-react";

import ThemeToggle from "@/components/theme/theme-toggle";
import { useRecognitionFeed } from "@/hooks/use-slide-analytics";
import { useCrmConfig } from "@/hooks/use-crm-config";
import { formatIntervalDisplay } from "@/lib/utils";
import RecognitionScroller from "@/components/presentation/recognition-scroller";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/shifts", label: "US Shift Management", icon: Clock },
  { href: "/admin/campaign-targets", label: "Campaign Targets", icon: Target },
  { href: "/admin/target-history", label: "Target History", icon: History },
  { href: "/admin/crm-config", label: "CRM & Sync API", icon: Server },
  { href: "/admin/presentation-settings", label: "Display Settings", icon: Settings },
];

const INCENTIVE_NAV_ITEMS = [
  { href: "/admin/incentives", label: "Incentive Dashboard", icon: Coins },
  { href: "/admin/incentives/config", label: "Incentive Configuration", icon: Sliders },
  { href: "/admin/incentives/daily", label: "Daily Incentive Audit", icon: FileCheck2 },
  { href: "/admin/incentives/settlements", label: "Settlement Management", icon: CalendarCheck2 },
  { href: "/admin/incentives/approvals", label: "Payout Approvals", icon: UserCheck },
  { href: "/admin/incentives/disbursements", label: "Payment Disbursement", icon: SendHorizontal },
  { href: "/admin/incentives/beneficiaries", label: "Beneficiary Management", icon: Building },
  { href: "/admin/incentives/history", label: "Transaction History", icon: History },
  { href: "/admin/incentives/payroll", label: "Payroll Reconciliation", icon: FileSpreadsheet },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const recogQuery = useRecognitionFeed();
  const { config } = useCrmConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen max-h-screen w-full bg-slate-100/90 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-hidden">
      {/* Top Navbar */}
      <header className="glass-panel border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 z-30 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-500 cursor-pointer transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center border border-cyan-400/30 shadow-sm flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DemandPulse <span className="text-cyan-600 dark:text-cyan-400 text-xs font-semibold">ADMIN PORTAL</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Operations Target Management</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/presentation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Launch Presentation</span>
          </Link>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-white/10">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
              AD
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200">Admin User</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Operations Lead</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Scrollable Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          />
        )}

        {/* Sidebar - Distinct visually & Independently Scrollable */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 lg:w-72 flex-shrink-0 bg-slate-50/95 dark:bg-[#0c1220] border-r border-slate-200/90 dark:border-white/10 p-4 flex flex-col justify-between h-full overflow-y-auto transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
        >
          <div className="flex flex-col gap-4">
            {/* Mobile close button */}
            <div className="flex items-center justify-between md:hidden pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Admin Navigation</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1">
                Target Administration
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                      ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 dark:border-cyan-500/30 font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                  </Link>
                );
              })}

              <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider px-3 mt-4 mb-1 flex items-center justify-between">
                <span>Incentive Automation</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
              {INCENTIVE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${isActive
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 dark:border-amber-500/30 font-bold shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
            <Link
              href="/admin/crm-config"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col gap-1 hover:border-cyan-500/40 transition-colors group cursor-pointer shadow-sm"
            >
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Activity className={`w-3.5 h-3.5 ${config.autoSyncEnabled ? "text-cyan-500 animate-pulse" : "text-amber-500"}`} />
                  {config.autoSyncEnabled ? `Auto-Sync (${formatIntervalDisplay(config.analyticsSyncInterval)})` : "Sync Paused"}
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 group-hover:underline font-bold">Configure</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {config.autoSyncEnabled
                  ? `Syncing live slides every ${formatIntervalDisplay(config.analyticsSyncInterval)}.`
                  : "Automatic polling currently paused."}
              </p>
            </Link>
          </div>
        </aside>

        {/* Content Area - Independent Scroll, Full Screen Width Utilization */}
        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          <div className="w-full max-w-[1750px] mx-auto flex flex-col gap-6">
            <RecognitionScroller
              data={recogQuery.data?.data}
              isLoading={recogQuery.isLoading}
              error={recogQuery.error as Error | null}
              onRetry={() => recogQuery.refetch()}
            />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
