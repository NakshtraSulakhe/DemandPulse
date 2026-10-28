"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Calendar,
} from "lucide-react";
import { getShiftBusinessDate } from "@/lib/shift/engine";

interface SyncRun {
  id: string;
  job_name: string;
  work_date: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed" | "partial";
  source_record_count: number;
  processed_record_count: number;
  failed_record_count: number;
  error_summary: string | null;
  source_watermark: string | null;
}

export default function SyncStatusAndBackfillPage() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [engineStatus, setEngineStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Backfill form state
  const [backfillStart, setBackfillStart] = useState<string>("");
  const [backfillEnd, setBackfillEnd] = useState<string>("");
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [isBackfilling, setIsBackfilling] = useState<boolean>(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/sync-status");
      const json = await res.json();
      if (json.success) {
        setRuns(json.runs || []);
        setEngineStatus(json.engine);
      }
    } catch (e) {
      console.error("Failed to load sync status:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRunLiveSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncFeedback(`Live sync successful: ${json.processedCount} records persisted for ${json.workDate}.`);
        await fetchStatus();
      } else {
        setSyncFeedback(`Sync completed with notice: ${json.message || json.error}`);
      }
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunBackfill = async () => {
    if (!backfillStart || !backfillEnd) {
      alert("Please select both start and end dates.");
      return;
    }

    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/analytics/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: backfillStart,
          end_date: backfillEnd,
          overwrite_existing: overwriteExisting,
          mark_final: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBackfillResult(json.data);
        await fetchStatus();
      } else {
        alert(json.error || "Backfill failed");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>Synchronization Engine & Historical Backfill</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Server-side orchestration service synchronizing PHP CRM Bridge data to MySQL with idempotent upserts, conflict prevention, and safe backfilling.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            disabled={isSyncing}
            onClick={handleRunLiveSync}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Synchronizing..." : "Trigger Live Sync"}</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-medium text-cyan-800 dark:text-cyan-300">
          {syncFeedback}
        </div>
      )}

      {/* Backfill Section Card */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Historical Data Backfill</h2>
          </div>
          <span className="text-[11px] text-slate-400">Section 17 Safe Backfill Engine</span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Select a date range to reconstruct missing historical records in MySQL. The engine requests data from CRM APIs, detects missing intervals without fabricating data, and stores finalized snapshots.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-400">Start Date:</span>
            <input
              type="date"
              value={backfillStart}
              onChange={(e) => setBackfillStart(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <span className="text-[11px] text-slate-400">End Date:</span>
            <input
              type="date"
              value={backfillEnd}
              onChange={(e) => setBackfillEnd(e.target.value)}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-medium outline-none cursor-pointer"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
              className="rounded border-slate-400 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>Overwrite existing days</span>
          </label>

          <button
            disabled={isBackfilling || !backfillStart || !backfillEnd}
            onClick={handleRunBackfill}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isBackfilling ? "Backfilling in progress..." : "Start Safe Backfill"}</span>
          </button>
        </div>

        {backfillResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 flex flex-col gap-2.5">
            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Backfill Summary: {backfillResult.totalDays} day(s) evaluated</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Fully Reconstructed: {backfillResult.reconstructedDays}
              </div>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                Partially Reconstructed: {backfillResult.partialDays}
              </div>
              <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Already In Database: {backfillResult.alreadyPersistedDays}
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300">
                Failed / Unavailable: {backfillResult.failedDays}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sync Execution Runs Table */}
      <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Recent Synchronization Execution Logs (analytics_sync_runs)
          </div>
          <button
            onClick={fetchStatus}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Started At</th>
                <th className="p-3.5">Job Name</th>
                <th className="p-3.5">Work Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Processed</th>
                <th className="p-3.5">Failed</th>
                <th className="p-3.5">Finished At</th>
                <th className="p-3.5">Notes / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading sync execution logs...</span>
                    </div>
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No synchronization runs logged yet. Click "Trigger Live Sync" to execute the first run.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const isCompleted = r.status === "completed";
                  const isFailed = r.status === "failed";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(r.started_at).toLocaleTimeString()}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {r.job_name}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {r.work_date}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCompleted
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : isFailed
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                              : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {r.processed_record_count} records
                      </td>

                      <td className="p-3.5 font-medium text-rose-600 dark:text-rose-400">
                        {r.failed_record_count}
                      </td>

                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {r.finished_at ? new Date(r.finished_at).toLocaleTimeString() : "—"}
                      </td>

                      <td className="p-3.5 text-slate-500 max-w-xs truncate" title={r.error_summary || ""}>
                        {r.error_summary || "Success"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
