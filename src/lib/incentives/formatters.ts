/**
 * Formatting and visual state helpers for Incentive Automation
 */

export function formatINR(amount: number | string | undefined | null): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(numeric)) return "₹0";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export function formatINRWithDecimals(amount: number | string | undefined | null): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(numeric)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(numeric);
}

export function formatPoints(points: number | string | undefined | null): string {
  const numeric = typeof points === "string" ? parseFloat(points) : (points ?? 0);
  if (isNaN(numeric)) return "0.0";
  return numeric.toFixed(1);
}

export function formatPercentage(pct: number | string | undefined | null): string {
  const numeric = typeof pct === "string" ? parseFloat(pct) : (pct ?? 0);
  if (isNaN(numeric)) return "0%";
  return `${numeric.toFixed(1)}%`;
}

export function getEligibilityBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "eligible":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "ineligible":
      return "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700";
    default:
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
}

export function getApprovalBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "rejected":
      return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
    case "pending_approval":
    default:
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
  }
}

export function getPaymentBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
    case "processing":
      return "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30";
    case "failed":
      return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
    case "unpaid":
    default:
      return "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700";
  }
}
