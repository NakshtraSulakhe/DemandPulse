"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  UserCheck,
  Building,
  Clock,
  Award,
  Users,
  Briefcase,
  AlertTriangle,
} from "lucide-react";

import ThemeToggle from "@/components/theme/theme-toggle";
import { useRecognitionFeed } from "@/hooks/use-slide-analytics";
import { useCrmConfig } from "@/hooks/use-crm-config";
import { formatIntervalDisplay } from "@/lib/utils";
import RecognitionScroller from "@/components/presentation/recognition-scroller";
import { SessionUser } from "@/lib/auth";

// Allowed routes for operations role
const OPERATIONS_ALLOWED_ROUTES = [
  "/admin/campaign-targets",
  "/admin/target-history",
  "/admin/shifts",
  "/admin/presentation-settings",
];

// Admin full navigation
const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/incentives", label: "Incentive Hub (Agents & QA)", icon: Coins },
  { href: "/admin/incentives/qa-plans", label: "QA Incentive Plans", icon: Award },
  { href: "/admin/shifts", label: "US Shift Management", icon: Clock },
  { href: "/admin/campaign-targets", label: "Campaign Targets", icon: Target },
  { href: "/admin/target-history", label: "Target History", icon: History },
  { href: "/admin/presentation-settings", label: "Display Settings", icon: Settings },
  { href: "/admin/crm-config", label: "CRM & Sync API", icon: Server },
  { href: "/admin/users", label: "User Management (Operations & Admin)", icon: Users },
];

// Operations restricted navigation
const OPERATIONS_NAV_ITEMS = [
  { href: "/admin/campaign-targets", label: "Campaign Targets", icon: Target },
  { href: "/admin/target-history", label: "Target History", icon: History },
  { href: "/admin/shifts", label: "US Shift Management", icon: Clock },
  { href: "/admin/presentation-settings", label: "Display Settings", icon: Settings },
];

const HISTORICAL_ANALYTICS_NAV_ITEMS = [
  { href: "/admin/analytics/history", label: "Daily History & Finalization", icon: History },
  { href: "/admin/analytics/campaigns", label: "Campaign Snapshots", icon: Target },
  { href: "/admin/analytics/agents", label: "Agent Productivity", icon: UserCheck },
  { href: "/admin/analytics/qa", label: "QA Department Audits", icon: FileCheck2 },
  { href: "/admin/analytics/floor-capacity", label: "Floor Capacity & Trends", icon: Building },
  { href: "/admin/analytics/incentives", label: "Incentive Archive", icon: Coins },
  { href: "/admin/analytics/sync-status", label: "Sync Engine & Backfill", icon: Server },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const recogQuery = useRecognitionFeed();
  const { config } = useCrmConfig();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication & Role State
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  // 1. Fetch current session user on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.ok && data.user) {
          setUser(data.user);
        } else {
          router.replace("/login");
          return;
        }
      } catch (err) {
        console.warn("[AdminLayout] Auth verification error:", err);
        if (isMounted) {
          router.replace("/login");
        }
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Strict Role-Based Route Protection
  useEffect(() => {
    if (isAuthLoading || !user) return;

    if (user.role === "operations") {
      const isAllowed = OPERATIONS_ALLOWED_ROUTES.some((allowed) =>
        pathname === allowed || pathname.startsWith(`${allowed}/`)
      );

      if (!isAllowed) {
        setAccessDeniedMessage(
          `Operations role has restricted access. You have been redirected to Campaign Targets.`
        );
        router.replace("/admin/campaign-targets");
        const timer = setTimeout(() => setAccessDeniedMessage(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, user, isAuthLoading, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    router.push("/login");
    router.refresh();
  };

  const isOps = user?.role === "operations";
  const displayedNavItems = isOps ? OPERATIONS_NAV_ITEMS : ADMIN_NAV_ITEMS;

  if (isAuthLoading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 tracking-wide">
            Verifying session access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-full bg-slate-100/90 dark:bg-[#000000] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-hidden">
      {/* Top Navbar */}
      <header className="glass-panel border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 z-30 bg-white/80 dark:bg-[#000000]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-500 cursor-pointer transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link
            href={isOps ? "/admin/campaign-targets" : "/admin"}
            className="flex items-center gap-3"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm flex-shrink-0 ${
                isOps
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-400/30 text-white"
                  : "bg-gradient-to-tr from-cyan-600 to-blue-500 border-cyan-400/30 text-white"
              }`}
            >
              {isOps ? <Briefcase className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DemandPulse{" "}
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                    isOps
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                      : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25"
                  }`}
                >
                  {isOps ? "OPERATIONS PORTAL" : "ADMIN PORTAL"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isOps
                  ? "Target Setting & Shift Controls"
                  : "Full Analytics & Operational Governance"}
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/presentation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Launch Presentation</span>
          </Link>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-white/10">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                isOps
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500"
                  : "bg-gradient-to-tr from-cyan-600 to-blue-600"
              }`}
            >
              {(user?.name || "AD")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{user?.name || "User"}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-extrabold uppercase ${
                    isOps
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                  }`}
                >
                  {user?.role || "ADMIN"}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                {user?.email || "Signed In"}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-white/5 transition-colors cursor-pointer ml-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
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
          className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto w-64 lg:w-72 flex-shrink-0 bg-slate-50/95 dark:bg-[#000000] border-r border-slate-200/90 dark:border-white/10 p-4 flex flex-col justify-between h-full overflow-y-auto transition-transform duration-200 ease-in-out shadow-xl md:shadow-none ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex flex-col gap-4">
            {/* Mobile close button */}
            <div className="flex items-center justify-between md:hidden pb-3 border-b border-slate-200 dark:border-white/10">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isOps ? "Operations Menu" : "Admin Menu"}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-1 flex items-center justify-between">
                <span>{isOps ? "Operations Scope" : "Target Administration"}</span>
                {isOps && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    4 TABS
                  </span>
                )}
              </div>

              {displayedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? isOps
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-500/30 font-bold shadow-sm"
                          : "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 dark:border-cyan-500/30 font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight
                        className={`w-3.5 h-3.5 ${
                          isOps ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400"
                        }`}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Historical Analytics - Admin Only */}
              {!isOps && (
                <>
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider px-3 mt-4 mb-1 flex items-center justify-between">
                    <span>Historical Analytics (DB-Backed)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  </div>
                  {HISTORICAL_ANALYTICS_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 dark:border-indigo-500/30 font-bold shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
          </div>

          {/* Footer Info Box */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
            {!isOps ? (
              <Link
                href="/admin/crm-config"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#050505] border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-400 flex flex-col gap-1 hover:border-cyan-500/40 transition-colors group cursor-pointer shadow-sm"
              >
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Activity
                      className={`w-3.5 h-3.5 ${
                        config.autoSyncEnabled ? "text-cyan-500 animate-pulse" : "text-amber-500"
                      }`}
                    />
                    {config.autoSyncEnabled
                      ? `Auto-Sync (${formatIntervalDisplay(config.analyticsSyncInterval)})`
                      : "Sync Paused"}
                  </span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 group-hover:underline font-bold">
                    Configure
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {config.autoSyncEnabled
                    ? `Syncing live slides every ${formatIntervalDisplay(config.analyticsSyncInterval)}.`
                    : "Automatic polling currently paused."}
                </p>
              </Link>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                  Operations Scope Active
                </span>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Access granted for Targets, Shift Management, and Display Scaling.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Content Area - Independent Scroll */}
        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          <div className="w-full max-w-[1750px] mx-auto flex flex-col gap-6">
            {/* Access Denied Flash Banner */}
            {accessDeniedMessage && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 animate-fadeIn shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">{accessDeniedMessage}</span>
              </div>
            )}

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
