"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/theme/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demandflow.io");
  const [password, setPassword] = useState("DemandFlow2026!");
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
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/admin/campaign-targets");
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
      <div className="absolute -bottom-[30%] -right-[10%] w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Corner Controls */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle variant="pill" />
      </div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30 mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">DemandFlow Bridge</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Operations & Live Analytics Administrator Access
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demandflow.io"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="text-cyan-700 dark:text-cyan-400 font-semibold">Demo credentials:</span>{" "}
            admin@demandflow.io / DemandFlow2026!
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/25 border border-cyan-400/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{isLoading ? "Signing in..." : "Access Admin Portal"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
