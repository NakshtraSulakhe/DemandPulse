"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShiftCurrentState, ShiftConfiguration } from "@/types/shift";

export function useShiftConfig() {
  return useQuery<{ success: boolean; data: ShiftConfiguration }>({
    queryKey: ["shift", "config"],
    queryFn: async () => {
      const res = await fetch("/api/shifts/config");
      if (!res.ok) throw new Error("Failed to load shift configuration");
      return res.json();
    },
    staleTime: 60000,
  });
}

export function useShiftEngine(pollInterval: number | false = 10000) {
  const query = useQuery<{ success: boolean; data: ShiftCurrentState }>({
    queryKey: ["shift", "current"],
    queryFn: async () => {
      const res = await fetch("/api/shifts/current");
      if (!res.ok) throw new Error("Failed to load current shift state");
      return res.json();
    },
    refetchInterval: pollInterval !== false ? pollInterval : false,
    staleTime: 5000,
  });

  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const state = query.data?.data;

  return {
    ...query,
    shiftState: state,
    isShiftActive: state?.isShiftActive ?? false,
    businessDate: state?.businessDate ?? new Date().toISOString().split("T")[0],
    currentIstFormatted: state?.currentIstFormatted ?? "",
    currentUsFormatted: state?.currentUsFormatted ?? "",
    usTimezoneAbbr: state?.usTimezoneAbbr ?? "EDT",
    percentElapsed: state?.percentElapsed ?? 0,
    status: state?.status ?? "active",
    nextShiftStart: state?.nextShiftStartIst ?? "",
    liveSeconds,
  };
}
