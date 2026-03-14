"use client";

import { useEffect, useRef } from "react";
import { createChart, LineStyle, LineSeries } from "lightweight-charts";
import type { Market } from "@/types/market";
import { useMarketTicks } from "@/hooks/use-market-ticks";
import { createBaseChartOptions, createLineSeriesOptions, getMaxSeconds } from "@/lib/chart-config";
import { CHART_BASE_TIME } from "@/lib/constants";
import { formatUTCTime, getOutcomeColors, getOutcomeLabel } from "@/lib/formatters";
import { exportSingleMarketCsv } from "@/lib/csv";
import { ChartHeader } from "./chart-header";
import { DownloadButton } from "./download-button";
import { LoadingSpinner } from "./loading-spinner";

export function MarketChart({ market }: { market: Market }) {
  const { ticks, loading } = useMarketTicks(market.market_id);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const asset = market.market_type?.split("_")[0] || "";
  const interval = market.market_type?.split("_")[1] || "";
  const { line: lineColor, text: outcomeColor } = getOutcomeColors(market.final_outcome);
  const outcomeLabel = getOutcomeLabel(market.final_outcome);

  useEffect(() => {
    if (loading || ticks.length === 0 || !chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const chart = createChart(container, createBaseChartOptions());

    const lineSeries = chart.addSeries(LineSeries, createLineSeriesOptions(lineColor));

    lineSeries.setData(
      ticks.map((t) => ({
        time: (CHART_BASE_TIME + t.seconds) as any,
        value: t.up_price,
      }))
    );

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
    };
  }, [loading, ticks, lineColor, interval]);

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

  if (ticks.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <ChartHeader
          title={asset.toUpperCase()}
          interval={interval}
          startTime={startTime}
          endTime={endTime}
        />
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
          tickCount={ticks.length}
        />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400">
              Result
            </p>
            <p className={`text-lg font-bold uppercase ${outcomeColor}`}>
              {outcomeLabel}
            </p>
          </div>
          <DownloadButton label="CSV" onClick={() => exportSingleMarketCsv(ticks, market.market_type, market.market_id)} />
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="mt-4 flex-1 min-h-0 rounded-lg border border-zinc-800/30 bg-zinc-950/50 overflow-hidden"
      />
    </div>
  );
}
