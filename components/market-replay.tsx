"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, LineStyle, LineSeries } from "lightweight-charts";
import type { Market, TickData } from "@/types/market";
import { useMarketTicks } from "@/hooks/use-market-ticks";
import { createBaseChartOptions, createLineSeriesOptions, getMaxSeconds } from "@/lib/chart-config";
import { CHART_BASE_TIME } from "@/lib/constants";
import { formatUTCTime, getOutcomeColors, getOutcomeLabel } from "@/lib/formatters";
import { ChartHeader } from "./chart-header";
import { LoadingSpinner } from "./loading-spinner";

interface MarketReplayProps {
  market: Market;
}

type PlaybackSpeed = 1 | 2 | 4 | 8;

export function MarketReplay({ market }: MarketReplayProps) {
  const { ticks, loading } = useMarketTicks(market.market_id);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [speed, setSpeed] = useState<PlaybackSpeed>(2);
  const [revealed, setRevealed] = useState(false); // outcome revealed?

  const asset = market.market_type?.split("_")[0] || "";
  const interval = market.market_type?.split("_")[1] || "";
  const { line: lineColor, text: outcomeColor } = getOutcomeColors(
    revealed ? market.final_outcome : null
  );
  const outcomeLabel = getOutcomeLabel(market.final_outcome);

  // Initialize chart
  useEffect(() => {
    if (loading || ticks.length === 0 || !chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, createBaseChartOptions());
    chartRef.current = chart;

    const lineSeries = chart.addSeries(LineSeries, createLineSeriesOptions(lineColor));
    seriesRef.current = lineSeries;

    lineSeries.createPriceLine({
      price: 0.5,
      color: "#3f3f46",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });

    const maxSeconds = getMaxSeconds(interval);
    chart.timeScale().setVisibleRange({
      from: CHART_BASE_TIME as any,
      to: (CHART_BASE_TIME + maxSeconds) as any,
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [loading, ticks.length, lineColor, interval]);

  // Update chart data based on progress
  useEffect(() => {
    if (!seriesRef.current || ticks.length === 0) return;

    const visibleCount = Math.max(1, Math.floor(progress * ticks.length));
    const visibleTicks = ticks.slice(0, visibleCount);

    seriesRef.current.setData(
      visibleTicks.map((t: TickData) => ({
        time: (CHART_BASE_TIME + t.seconds) as any,
        value: t.up_price,
      }))
    );
  }, [progress, ticks]);

  // Playback animation
  const play = useCallback(() => {
    if (ticks.length === 0) return;
    setIsPlaying(true);
    setRevealed(false);

    let startTime: number | null = null;
    const duration = (ticks.length / speed) * 20; // ms per tick divided by speed

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const startProgress = progress;
      const newProgress = Math.min(startProgress + (elapsed / duration), 1);

      setProgress(newProgress);

      if (newProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setRevealed(true);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [ticks.length, speed, progress]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const reset = useCallback(() => {
    pause();
    setProgress(0);
    setRevealed(false);
  }, [pause]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (val < 1) setRevealed(false);
    if (val >= 1) setRevealed(true);
  }, []);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Reset when market changes
  useEffect(() => {
    reset();
  }, [market.market_id]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="h-5 w-48 animate-pulse rounded bg-zinc-800/80" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-800/60" />
        <div className="mt-6 flex flex-1 items-center justify-center rounded-lg border border-zinc-800/30 bg-zinc-950/50">
          <LoadingSpinner label="Loading tick data..." />
        </div>
      </div>
    );
  }

  const startTime = formatUTCTime(market.started_at);
  const endTime = formatUTCTime(market.ended_at);
  const visibleCount = Math.max(1, Math.floor(progress * ticks.length));
  const currentTick = ticks[visibleCount - 1];
  const currentPrice = currentTick ? (currentTick.up_price * 100).toFixed(1) : "—";

  if (ticks.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <ChartHeader title={asset.toUpperCase()} interval={interval} startTime={startTime} endTime={endTime} />
        <div className="flex flex-1 items-center justify-center rounded-lg border border-zinc-800/30 bg-zinc-950/50 mt-4">
          <span className="text-base text-zinc-400">No tick data for this market</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-start justify-between">
        <ChartHeader
          title={asset.toUpperCase()}
          interval={interval}
          startTime={startTime}
          endTime={endTime}
          tickCount={visibleCount}
        />
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
            {revealed ? "Result" : "Live Price"}
          </p>
          {revealed ? (
            <p className={`text-lg font-bold uppercase ${outcomeColor}`}>
              {outcomeLabel}
            </p>
          ) : (
            <p className="font-mono text-lg font-bold text-zinc-200">
              {currentPrice}¢
            </p>
          )}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="mt-4 flex-1 min-h-0 rounded-lg border border-zinc-800/30 bg-zinc-950/50 overflow-hidden"
      />

      {/* Playback controls */}
      <div className="mt-3 flex items-center gap-3">
        {/* Play/Pause button */}
        <button
          onClick={isPlaying ? pause : progress >= 1 ? () => { reset(); setTimeout(play, 50); } : play}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          title={isPlaying ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="4" height="12" rx="1" />
              <rect x="8" y="1" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 1.5L12 7L2 12.5V1.5Z" />
            </svg>
          )}
        </button>

        {/* Reset button */}
        <button
          onClick={reset}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1v5h5" />
            <path d="M2.5 9A5.5 5.5 0 1 0 3 4.5L1 6" />
          </svg>
        </button>

        {/* Progress slider */}
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={handleSlider}
            className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(228,246,0,0.3)]"
          />
        </div>

        {/* Speed selector */}
        <div className="flex gap-1">
          {([1, 2, 4, 8] as PlaybackSpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                speed === s
                  ? "bg-primary/20 text-primary"
                  : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Progress label */}
        <span className="font-mono text-[10px] text-zinc-500 tabular-nums w-10 text-right">
          {(progress * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
