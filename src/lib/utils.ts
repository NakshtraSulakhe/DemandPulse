import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-US").format(val);
}

export function formatPercent(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return "0%";
  return `${Math.round(val * 10) / 10}%`;
}

export function formatTime(timeStr: string | undefined | null): string {
  if (!timeStr) return "--:--";
  return timeStr.slice(0, 5);
}

export function formatIntervalDisplay(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m (${seconds}s)`;
  return `${m}m ${s}s (${seconds}s)`;
}

