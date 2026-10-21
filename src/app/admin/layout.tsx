"use client";

import React from "react";
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
} from "lucide-react";

import ThemeToggle from "@/components/theme/theme-toggle";
import { useRecognitionFeed } from "@/hooks/use-slide-analytics";
import { useCrmConfig } from "@/hooks/use-crm-config";
import RecognitionScroller from "@/components/presentation/recognition-scroller";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/campaign-targets", label: "Campaign Targets", icon: Target },
  { href: "/admin/target-history", label: "Target History", icon: History },
  { href: "/admin/crm-config", label: "CRM & Sync API", icon: Server },
  { href: "/admin/presentation-settings", label: "Display Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const recogQuery = useRecognitionFeed();
  const { config } = useCrmConfig();

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="glass-panel border-b border-slate-200/80 dark:border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center border border-cyan-400/30 shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DemandFlow <span className="text-cyan-600 dark:text-cyan-400 text-xs font-semibold">ADMIN PORTAL</span>
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
            <span>Launch Presentation</span>
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

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200/80 dark:border-white/10 glass-panel p-4 hidden md:flex flex-col justify-between">
          <nav className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
              Target Administration
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 dark:border-cyan-500/30 font-semibold shadow-sm"
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
          </nav>

          <Link
            href="/admin/crm-config"
            className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-900/60 border border-slate-300/60 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col gap-1 hover:border-cyan-500/40 transition-colors group cursor-pointer"
          >
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className={`w-3 h-3 ${config.autoSyncEnabled ? "text-cyan-500 animate-pulse" : "text-amber-500"}`} />
                {config.autoSyncEnabled ? `Auto-Sync (${config.analyticsSyncInterval}s)` : "Sync Paused"}
              </span>
              <span className="text-[9px] text-cyan-600 dark:text-cyan-400 group-hover:underline">Edit</span>
            </div>
            <p className="text-[10px] text-slate-500">
              {config.autoSyncEnabled
                ? `Syncing live slides every ${config.analyticsSyncInterval}s with CRM API.`
                : "Automatic background sync is currently paused."}
            </p>
          </Link>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col gap-5">
          <RecognitionScroller
            data={recogQuery.data?.data}
            isLoading={recogQuery.isLoading}
            error={recogQuery.error as Error | null}
            onRetry={() => recogQuery.refetch()}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
