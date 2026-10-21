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
