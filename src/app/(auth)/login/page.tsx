"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Sliders,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Route based on role
      if (data.user?.role === "operations") {
        router.push("/admin/campaign-targets");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-200">
      {/* Background ambient lighting */}
      <div className="absolute -top-[30%] -left-[10%] w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-[30%] -right-[10%] w-[600px] h-[600px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Corner Controls */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="pill" />
      </div>

      <div className="w-full max-w-lg glass-panel p-8 sm:p-9 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative z-10 animate-fadeIn backdrop-blur-xl bg-white/80 dark:bg-slate-950/80">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30 mb-3">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            DemandPulse Portal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Role-Based Access for Operations & System Administration
          </p>
        </div>

        {/* Role Information Card */}
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-500" />
            Database Authenticated Roles:
          </span>
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
              <div className="font-bold text-[11px] flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>Administrator</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono">
                  ALL ACCESS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Console, sync, incentives & user management</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
              <div className="font-bold text-[11px] flex items-center justify-between text-slate-800 dark:text-slate-200">
                <span>Operations</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
                  RESTRICTED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Campaign targets, history, shifts & display</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter registered email or username"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                Sign In to Portal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Permissions breakdown hint */}
        <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Role Permission Overview:
          </div>
          <ul className="space-y-1.5 text-[10.5px]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>
                <b>Operations:</b> Campaign Targets, Target History, US Shift Management, Display Settings.
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span>
                <b>Administrator:</b> All Operations features + User Creation & Management, CRM Config, Analytics & Incentives.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
