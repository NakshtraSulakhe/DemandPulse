"use client";

import React, { useState, useEffect, useCallback } from "react";
import PresentationHeader from "@/components/presentation/presentation-header";
import SlideOperationsOverview from "@/components/presentation/slide-operations-overview";
import SlideAgentProductivity from "@/components/presentation/slide-agent-productivity";
import SlideQaHeatmap from "@/components/presentation/slide-qa-heatmap";
import SlideAgentHeatmap from "@/components/presentation/slide-agent-heatmap";
import SlideComparativeAnalytics from "@/components/presentation/slide-comparative-analytics";
import {
  useSlide1,
  useSlide2,
  useSlide3,
  useSlide4,
  useSlide5,
  useRecognitionFeed,
} from "@/hooks/use-slide-analytics";
import { useCrmConfig } from "@/hooks/use-crm-config";
import RecognitionScroller from "@/components/presentation/recognition-scroller";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";

export default function PresentationPage() {
  const { config } = useCrmConfig();
  const rotationInterval = config.slideRotationInterval || 25;

  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(rotationInterval);
  const [heatmapInterval, setHeatmapInterval] = useState<number>(config.heatmapGranularity || 10);
  const [isTvMode, setIsTvMode] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("demandflow-heatmap-interval");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 15, 20, 30, 60].includes(parsed)) {
          setHeatmapInterval(parsed);
        }
      }
      const savedTv = localStorage.getItem("demandflow-tv-mode");
      if (savedTv !== null) {
        setIsTvMode(savedTv === "true");
      }
    } catch {}
  }, []);

  const handleHeatmapIntervalChange = useCallback((newInterval: number) => {
    setHeatmapInterval(newInterval);
    try {
      localStorage.setItem("demandflow-heatmap-interval", String(newInterval));
    } catch {}
  }, []);

  const handleToggleTvMode = useCallback(() => {
    setIsTvMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("demandflow-tv-mode", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Queries for each slide with automatic polling
  const s1Query = useSlide1();
  const s2Query = useSlide2(undefined, 1, "all");
  const s3Query = useSlide3(undefined, heatmapInterval);
  const s4Query = useSlide4(undefined, heatmapInterval);
  const s5Query = useSlide5();
  const recogQuery = useRecognitionFeed();

  const hasError = !!(s1Query.error || s2Query.error || s3Query.error || s4Query.error || s5Query.error);
  const isLive = !hasError && !!(s1Query.data || s2Query.data || s3Query.data || s4Query.data || s5Query.data);

  const lastRefreshed =
    s1Query.data?.timestamp ||
    s2Query.data?.timestamp ||
    new Date().toISOString();

  const isFetching =
    s1Query.isFetching ||
    s2Query.isFetching ||
    s3Query.isFetching ||
    s4Query.isFetching ||
    s5Query.isFetching;

  // Next slide handler
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev % 5) + 1);
    setCountdown(rotationInterval);
  }, [rotationInterval]);

  // Previous slide handler
  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 1 ? 5 : prev - 1));
    setCountdown(rotationInterval);
  }, [rotationInterval]);

  // Slide rotation ticker
  useEffect(() => {
    if (!autoRotate) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          nextSlide();
          return rotationInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRotate, nextSlide, rotationInterval]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setAutoRotate((prev) => !prev);
      } else if (e.key >= "1" && e.key <= "5") {
        setCurrentSlide(parseInt(e.key, 10));
        setCountdown(rotationInterval);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, rotationInterval]);

  const handleManualRefresh = () => {
    s1Query.refetch();
    s2Query.refetch();
    s3Query.refetch();
    s4Query.refetch();
    s5Query.refetch();
    recogQuery.refetch();
  };

  return (
    <div className={`min-h-screen bg-slate-100/70 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 transition-colors duration-200 floor-tv-display ${isTvMode ? "tv-mode-boost" : ""}`}>
      {/* Background ambient lighting for large displays */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-[10%] w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] -right-[10%] w-[700px] h-[700px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-[20%] left-[30%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.03)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] opacity-60 dark:opacity-40" />
      </div>

      {/* Header bar */}
      <PresentationHeader
        currentSlide={currentSlide}
        totalSlides={5}
        onSelectSlide={(s) => {
          setCurrentSlide(s);
          setCountdown(rotationInterval);
        }}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
        countdownSeconds={countdown}
        isLiveConnection={isLive}
        lastRefreshed={lastRefreshed}
        isFetching={isFetching}
        onManualRefresh={handleManualRefresh}
        heatmapInterval={heatmapInterval}
        onHeatmapIntervalChange={handleHeatmapIntervalChange}
        isTvMode={isTvMode}
        onToggleTvMode={handleToggleTvMode}
      />

      {/* Live Daily Floor Recognition Ticker (Top Leads Scored, Birthdays, Anniversaries) */}
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-5 pt-1.5 z-10">
        <RecognitionScroller
          data={recogQuery.data?.data}
          isLoading={recogQuery.isLoading}
          error={recogQuery.error as Error | null}
          onRetry={() => recogQuery.refetch()}
        />
      </div>

      {/* Slide Content Display Area */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-2 sm:p-4 z-10 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.99, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full flex-1"
          >
            {currentSlide === 1 && (
              <SlideOperationsOverview
                data={s1Query.data?.data}
                isLoading={s1Query.isLoading}
                error={s1Query.error as Error | null}
                onRetry={() => s1Query.refetch()}
              />
            )}

            {currentSlide === 2 && (
              <SlideAgentProductivity
                data={s2Query.data?.data}
                isLoading={s2Query.isLoading}
                error={s2Query.error as Error | null}
                onRetry={() => s2Query.refetch()}
              />
            )}

            {currentSlide === 3 && (
              <SlideQaHeatmap
                data={s3Query.data?.data}
                isLoading={s3Query.isLoading}
                error={s3Query.error as Error | null}
                onRetry={() => s3Query.refetch()}
                interval={heatmapInterval}
                onIntervalChange={handleHeatmapIntervalChange}
              />
            )}

            {currentSlide === 4 && (
              <SlideAgentHeatmap
                data={s4Query.data?.data}
                isLoading={s4Query.isLoading}
                error={s4Query.error as Error | null}
                onRetry={() => s4Query.refetch()}
                interval={heatmapInterval}
                onIntervalChange={handleHeatmapIntervalChange}
              />
            )}

            {currentSlide === 5 && (
              <SlideComparativeAnalytics
                data={s5Query.data?.data}
                isLoading={s5Query.isLoading}
                error={s5Query.error as Error | null}
                onRetry={() => s5Query.refetch()}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer info bar for presentation monitors */}
        <footer className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-slate-800 dark:text-slate-200 font-bold">DemandFlow Bridge Operations Floor Monitor</span>
            {isTvMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-black uppercase tracking-wider">
                65″ Floor TV Mode Active
              </span>
            )}
            <span className="hidden md:inline text-slate-400">• 1920×1080 Ultra-Legible Distance Display</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-medium">Controls: [Space] Pause/Play • [← / →] Slides • [1-5] Direct Jump</span>
            {hasError && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> CRM Upstream API disconnected
              </span>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
