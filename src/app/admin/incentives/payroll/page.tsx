"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  Info,
  DollarSign,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { usePayrollReport } from "@/hooks/useIncentiveHistory";
import { formatINR } from "@/lib/incentives/formatters";

export default function PayrollReconciliationPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isFetching, refetch, error } = usePayrollReport(selectedMonth);

  const report = data?.data;
  const agents = report?.agents || [];
  const summary = report?.summary;

  // Handle direct authenticated CSV export
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const url = `/api/incentives/report?month=${encodeURIComponent(selectedMonth)}&export=csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to export CSV");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `incentive_payroll_reconciliation_${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      alert("Failed to download CSV: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Monthly Payroll Reconciliation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Matches daily disbursed incentives against monthly salary deductions to prevent double compensation
          </p>
        </div>

        {/* Month Selector & CSV Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs cursor-pointer font-mono font-bold"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl glass-panel border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh payroll data"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-500" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Payroll Policy Notice */}
      <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-900 dark:text-cyan-200 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Automated HR Reconciliation Rule: </span>
          {summary?.reconciliation_rule ||
            "To prevent double compensation, monthly gross salary must deduct daily_disbursed_total from the Productivity incentives bucket in hr/payroll.php."}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Agents With Incentives
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summary?.total_agents_with_incentives || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active earners in {selectedMonth}</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Settled Amount
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatINR(summary?.total_settled_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total calculated daily incentives</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 dark:border-white/10">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Already Disbursed Daily
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(summary?.total_already_disbursed_daily || 0)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Deduct from salary run</div>
        </div>
      </div>

      {/* Agent-wise Reconciliation Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Agent-Wise Payroll Adjustment Matrix
          </h3>
          <span className="text-xs text-slate-500 font-mono">Period: {selectedMonth}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-2.5 px-3">Agent</th>
                <th className="py-2.5 px-2">Emp ID</th>
                <th className="py-2.5 px-2 text-center">Settled Days</th>
                <th className="py-2.5 px-2 text-center">Paid Days</th>
                <th className="py-2.5 px-2 text-right">Total Settled</th>
                <th className="py-2.5 px-2 text-right text-emerald-600">Disbursed Daily</th>
                <th className="py-2.5 px-2 text-right text-cyan-600">Approved Unpaid</th>
                <th className="py-2.5 px-2 text-right text-amber-600">Pending Approval</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">Recommended Deduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    No settled incentive records found for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                agents.map((a) => (
                  <tr
                    key={a.agent_id}
                    className="hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{a.agent_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Agent #{a.agent_id} • {a.department}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-600 dark:text-slate-400">
                      {a.employee_id || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono">{a.settled_days_count}</td>
                    <td className="py-2.5 px-2 text-center font-bold font-mono text-emerald-600">
                      {a.paid_days_count}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold font-mono">
                      {formatINR(a.total_settled_incentives)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-extrabold text-emerald-600 font-mono">
                      {formatINR(a.daily_disbursed_total)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-cyan-600 font-mono">
                      {formatINR(a.approved_unpaid_total)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-amber-600 font-mono">
                      {formatINR(a.pending_approval_total)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                      {formatINR(a.recommended_payroll_deduction)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
